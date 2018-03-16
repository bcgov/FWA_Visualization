package ca.bc.gov.fwa.networkcleanup;

import java.sql.PreparedStatement;
import java.sql.SQLException;

import ca.bc.gov.fwa.FwaController;
import ca.bc.gov.fwa.convert.FwaConstants;

import com.revolsys.geometry.graph.Edge;
import com.revolsys.geometry.graph.Node;
import com.revolsys.geometry.graph.RecordGraph;
import com.revolsys.jdbc.JdbcConnection;
import com.revolsys.jdbc.io.JdbcRecordStore;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.query.Query;
import com.revolsys.transaction.Transaction;

public class FwaSideChannelLocalCode implements FwaConstants {

  private static final String LOG_MESSAGE = "Set local code";

  private static final int LOG_STEP = 100000;

  public static void main(final String[] args) {
    new FwaSideChannelLocalCode().run();
  }

  private final JdbcRecordStore recordStore = (JdbcRecordStore)FwaController.getFwaRecordStore();

  private int count = 0;

  private void logCount(final String message) {
    if (++this.count % LOG_STEP == 0) {
      System.out.println(message + "\t" + this.count);
    }
  }

  private void logTotal(final String message) {
    System.out.println(message + "\t" + this.count);
    this.count = 0;
  }

  private RecordGraph newGraph() {
    final String message = "Read";
    final RecordGraph graph = new RecordGraph();
    final Query query = new Query(FWA_RIVER_NETWORK) //
      .setFieldNames(NetworkCleanupRecord.FWA_FIELD_NAMES) //
    ;
    try (
      RecordReader reader = this.recordStore.getRecords(query)) {
      for (final Record record : reader) {
        logCount(message);
        final NetworkCleanupRecord networkCleanupRecord = new NetworkCleanupRecord(record);
        graph.addEdge(networkCleanupRecord);
      }
    }
    logTotal(message);
    return graph;
  }

  private void processNode(final Node<Record> node) {
    if (node.getOutEdgeCount() == 2) {
      final Edge<Record> edge1 = node.getOutEdge(0);
      final Edge<Record> edge2 = node.getOutEdge(1);
      if (edge1.getToNode().equals(edge2.getToNode())) {
        final NetworkCleanupRecord record1 = edge1.getEdgeObject();
        final NetworkCleanupRecord record2 = edge2.getEdgeObject();
        if (record1.equalValues(record2, "watershedCode")) {
          final int id1 = record1.getId();
          final int id2 = record2.getId();

          final String localCode1 = record1.getLocalWatershedCode();
          final String localCode2 = record2.getLocalWatershedCode();

          if (localCode1 == null) {
            if (localCode2 != null) {
              updateRecord(id1, localCode2);
            }
          } else if (localCode2 == null) {
            updateRecord(id2, localCode1);
          }
        }
      }
    }
  }

  private void processNodes(final RecordGraph graph) {
    graph.forEachNode(this::processNode);
    logTotal(LOG_MESSAGE);
  }

  private void run() {
    final RecordGraph graph = newGraph();
    processNodes(graph);
  }

  private void updateRecord(final int updateId, final String localCode) {
    final String sql = "UPDATE FWA.FWA_RIVER_NETWORK SET LOCAL_WATERSHED_CODE = ? WHERE LINEAR_FEATURE_ID = ?";
    try (
      Transaction transaction = this.recordStore.newTransaction();
      JdbcConnection connection = this.recordStore.getJdbcConnection();
      PreparedStatement statement = connection.prepareStatement(sql);) {

      statement.setString(1, localCode);
      statement.setInt(2, updateId);
      statement.executeUpdate();
      logCount(LOG_MESSAGE);
    } catch (final SQLException e) {
      throw new RuntimeException(e);
    }

  }

}
