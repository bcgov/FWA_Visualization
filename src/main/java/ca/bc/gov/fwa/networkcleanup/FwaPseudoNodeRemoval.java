package ca.bc.gov.fwa.networkcleanup;

import java.sql.PreparedStatement;
import java.sql.SQLException;

import ca.bc.gov.fwa.FwaController;
import ca.bc.gov.fwa.convert.FwaConstants;

import com.revolsys.geometry.graph.Edge;
import com.revolsys.geometry.graph.RecordGraph;
import com.revolsys.geometry.model.LineString;
import com.revolsys.jdbc.JdbcConnection;
import com.revolsys.jdbc.field.JdbcFieldDefinition;
import com.revolsys.jdbc.io.JdbcRecordStore;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.query.Query;
import com.revolsys.transaction.Transaction;

public class FwaPseudoNodeRemoval implements FwaConstants {

  private static final int LOG_STEP = 100000;

  public static void main(final String[] args) {
    new FwaPseudoNodeRemoval().run();
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

  private void removePsuedoNodes(final RecordGraph graph) {
    graph.forEachNode(node -> {
      if (node.getInEdgeCount() == 1 && node.getOutEdgeCount() == 1) {
        final Edge<Record> edge1 = node.getInEdge(0);
        final Edge<Record> edge2 = node.getOutEdge(0);

        final NetworkCleanupRecord record1 = edge1.getEdgeObject();
        final NetworkCleanupRecord record2 = edge2.getEdgeObject();
        if (record1.equalValues(record2, "blueLineKey", "name", "watershedCode")) {
          if (!record1.isMultiLine() && !record2.isMultiLine()) {
            final int id1 = record1.getId();
            final int id2 = record2.getId();
            final LineString line1 = record1.getLine();
            final LineString line2 = record2.getLine();

            final Record dbRecord1 = this.recordStore.getRecord(FWA_RIVER_NETWORK, id1);
            final Record dbRecord2 = this.recordStore.getRecord(FWA_RIVER_NETWORK, id2);
            if (dbRecord1.equalValues(dbRecord2, STREAM_ORDER)) {
              final double newLength = record1.getLength() + record2.getLength();
              final LineString newLine = line1.merge(line2);

              final double upstreamRouteMeasure = dbRecord2.getDouble(UPSTREAM_ROUTE_MEASURE);
              final String sql = "UPDATE FWA.FWA_RIVER_NETWORK SET LENGTH_METRE = ?, UPSTREAM_ROUTE_MEASURE = ?, GEOMETRY = ? WHERE LINEAR_FEATURE_ID = ?";
              try (
                Transaction transaction = this.recordStore.newTransaction();
                JdbcConnection connection = this.recordStore.getJdbcConnection();
                PreparedStatement statement = connection.prepareStatement(sql);) {
                statement.setDouble(1, newLength);
                statement.setDouble(2, upstreamRouteMeasure);
                final JdbcFieldDefinition geometryField = (JdbcFieldDefinition)dbRecord1
                  .getFieldDefinition(GEOMETRY);
                geometryField.setInsertPreparedStatementValue(statement, 3, newLine);
                statement.setInt(4, id1);
                statement.executeUpdate();
                this.recordStore.deleteRecord(dbRecord2);
              } catch (final SQLException e) {
                throw new RuntimeException(e);
              }

              dbRecord1.setValue(LENGTH_METRE, newLength);
              dbRecord1.setValue(UPSTREAM_ROUTE_MEASURE, upstreamRouteMeasure);
              dbRecord1.setGeometryValue(newLine);

              final NetworkCleanupRecord newRecord = new NetworkCleanupRecord(dbRecord1);
              graph.addEdge(newRecord);
              edge1.remove();
              edge2.remove();
              logCount("Psuedo node");

            }
          }
        }
      }
    });
    logTotal("Psuedo node");
  }

  private void run() {
    final RecordGraph graph = newGraph();
    removePsuedoNodes(graph);
  }

}
