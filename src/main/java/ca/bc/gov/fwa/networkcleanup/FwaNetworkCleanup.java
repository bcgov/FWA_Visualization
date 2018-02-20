package ca.bc.gov.fwa.networkcleanup;

import java.util.HashSet;
import java.util.Set;

import ca.bc.gov.fwa.FwaController;
import ca.bc.gov.fwa.convert.FwaConstants;

import com.revolsys.geometry.graph.Edge;
import com.revolsys.geometry.graph.Node;
import com.revolsys.geometry.graph.RecordGraph;
import com.revolsys.jdbc.JdbcUtils;
import com.revolsys.jdbc.io.JdbcRecordStore;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.query.Query;
import com.revolsys.transaction.Transaction;
import com.revolsys.util.Debug;
import com.revolsys.value.LongValue;

public class FwaNetworkCleanup implements FwaConstants {

  private static final int LOG_STEP = 100000;

  private static final String UPDATE_SQL = "UPDATE FWA.FWA_RIVER_NETWORK SET " //
    + "DOWNSTREAM_LENGTH = ?, "//
    + "UPSTREAM_LENGTH = ? "//
    + "WHERE LINEAR_FEATURE_ID = ?";

  public static void main(final String[] args) {
    new FwaNetworkCleanup().run();
  }

  private final JdbcRecordStore recordStore = (JdbcRecordStore)FwaController.getFwaRecordStore();

  private int count = 0;

  private void addDownstreamLength(final LongValue total, final Node<Record> node,
    final Set<Edge<Record>> processedEdges) {
    for (final Edge<Record> downstreamEdge : node.getInEdges()) {
      if (processedEdges.add(downstreamEdge)) {
        final NetworkCleanupRecord downstreamRecord = (NetworkCleanupRecord)downstreamEdge
          .getObject();
        final long length = Math.round(downstreamRecord.getLength() * 1000);
        total.addValue(length);
        final Node<Record> oppositeNode = downstreamEdge.getOppositeNode(node);
        if (!oppositeNode.equals(node)) {
          addDownstreamLength(total, oppositeNode, processedEdges);
        }
      }
    }
  }

  private void addUpstreamLength(final LongValue total, final Node<Record> node,
    final Set<Edge<Record>> processedEdges) {
    for (final Edge<Record> upstreamEdge : node.getOutEdges()) {
      if (processedEdges.add(upstreamEdge)) {
        final NetworkCleanupRecord upstreamRecord = (NetworkCleanupRecord)upstreamEdge.getObject();
        final long length = Math.round(upstreamRecord.getLength() * 1000);
        total.addValue(length);
        final Node<Record> oppositeNode = upstreamEdge.getOppositeNode(node);
        if (!oppositeNode.equals(node)) {
          addUpstreamLength(total, oppositeNode, processedEdges);
        }
      }
    }
  }

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
      // .setWhereCondition(Q.like(FWA_WATERSHED_CODE, "990%")) //
      .addOrderBy(FWA_WATERSHED_CODE) //
      .addOrderBy(LOCAL_WATERSHED_CODE);
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

  private void run() {
    final RecordGraph graph = newGraph();
    setDownstreamAndUpstreamLengths(graph);
    updateRecords(graph);
  }

  private void setDownstreamAndUpstreamLengths(final RecordGraph graph) {
    final String message = "Calculate Lengths";
    graph.forEachEdge(edge -> {
      logCount(message);

      final LongValue total = new LongValue();

      final NetworkCleanupRecord record = (NetworkCleanupRecord)edge.getObject();
      final Set<Edge<Record>> processedEdges = new HashSet<>();
      final Node<Record> fromNode = edge.getFromNode();
      addDownstreamLength(total, fromNode, processedEdges);
      record.setDownstreamLength(total.value / 1000.0);

      processedEdges.clear();
      total.value = 0;
      final Node<Record> toNode = edge.getToNode();
      addUpstreamLength(total, toNode, processedEdges);
      record.setUpstreamLength(total.value / 1000.0);
    });
    logTotal(message);
  }

  private void updateRecords(final RecordGraph graph) {
    final String message = "Update records";
    graph.forEachEdge(edge -> {
      final NetworkCleanupRecord record = (NetworkCleanupRecord)edge.getObject();
      if (record.isModified()) {
        logCount(message);

        final int id = record.getId();
        final double downstreamLength = record.getDownstreamLength();
        final double upstreamLength = record.getUpstreamLength();
        try (
          Transaction transaction = this.recordStore.newTransaction()) {
          JdbcUtils.executeUpdate(this.recordStore, UPDATE_SQL, downstreamLength, upstreamLength,
            id);
        } catch (final Exception e) {
          Debug.noOp();
        }
      }
    });
    logTotal(message);
  }

}
