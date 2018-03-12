package ca.bc.gov.fwa.networkcleanup;

import java.sql.PreparedStatement;
import java.sql.SQLException;

import ca.bc.gov.fwa.FwaController;
import ca.bc.gov.fwa.convert.FwaConstants;

import com.revolsys.geometry.graph.Edge;
import com.revolsys.geometry.graph.Node;
import com.revolsys.geometry.graph.RecordGraph;
import com.revolsys.geometry.model.Lineal;
import com.revolsys.jdbc.JdbcConnection;
import com.revolsys.jdbc.field.JdbcFieldDefinition;
import com.revolsys.jdbc.io.JdbcRecordStore;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.query.Query;
import com.revolsys.transaction.Transaction;

public class FwaUnionSideChannels implements FwaConstants {

  private static final String LOG_MESSAGE = "Merged Side Channel";

  private static final int LOG_STEP = 100000;

  public static void main(final String[] args) {
    new FwaUnionSideChannels().run();
  }

  private final JdbcRecordStore recordStore = (JdbcRecordStore)FwaController.getFwaRecordStore();

  private final JdbcFieldDefinition geometryField = (JdbcFieldDefinition)this.recordStore
    .getRecordDefinition(FWA_RIVER_NETWORK)
    .getGeometryField();

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
        if (record1.equalValues(record2, "name", "watershedCode")) {
          final String localCode1 = record1.getLocalWatershedCode();
          final String localCode2 = record2.getLocalWatershedCode();

          final int id1 = record1.getId();
          final int id2 = record2.getId();
          final Lineal line1 = record1.getLineal();
          final Lineal line2 = record2.getLineal();

          if (localCode1 == null && localCode2 != null) {
            updateRecord(id1, line1, line2, id2);
          } else if (localCode2 == null && localCode1 != null) {
            updateRecord(id2, line2, line1, id1);
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

  private void updateRecord(final int updateId, final Lineal line1, final Lineal line2,
    final int deleteId) {
    final String sql = "UPDATE FWA.FWA_RIVER_NETWORK SET GEOMETRY = ? WHERE LINEAR_FEATURE_ID = ?";
    try (
      Transaction transaction = this.recordStore.newTransaction();
      JdbcConnection connection = this.recordStore.getJdbcConnection();
      PreparedStatement statement = connection.prepareStatement(sql);) {

      final Lineal mergedLine = line1.union(line2);
      this.geometryField.setInsertPreparedStatementValue(statement, 1, mergedLine);
      statement.setInt(2, updateId);
      statement.executeUpdate();
      this.recordStore.deleteRecord(FWA_RIVER_NETWORK, deleteId);
      logCount(LOG_MESSAGE);
    } catch (final SQLException e) {
      throw new RuntimeException(e);
    }

  }

}
