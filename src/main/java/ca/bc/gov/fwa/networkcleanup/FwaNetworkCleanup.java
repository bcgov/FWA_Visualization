package ca.bc.gov.fwa.networkcleanup;

import java.io.IOException;
import java.io.OutputStream;
import java.sql.Array;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.postgresql.largeobject.LargeObject;
import org.postgresql.largeobject.LargeObjectManager;

import ca.bc.gov.fwa.FwaController;
import ca.bc.gov.fwa.convert.FwaConstants;

import com.revolsys.geometry.graph.BinaryRoutePath;
import com.revolsys.geometry.graph.Edge;
import com.revolsys.geometry.graph.Node;
import com.revolsys.geometry.graph.RecordGraph;
import com.revolsys.jdbc.JdbcConnection;
import com.revolsys.jdbc.JdbcUtils;
import com.revolsys.jdbc.io.JdbcRecordStore;
import com.revolsys.logging.Logs;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.query.Q;
import com.revolsys.record.query.Query;
import com.revolsys.transaction.Transaction;
import com.revolsys.util.Debug;
import com.revolsys.util.Exceptions;
import com.revolsys.value.LongValue;

public class FwaNetworkCleanup implements FwaConstants {

  private static final String ROUTE_UPDATE_SQL = "UPDATE FWA.FWA_RIVER_NETWORK SET " //
    + "ROUTES = ? "//
    + "WHERE LINEAR_FEATURE_ID = ?";

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

  private int updateCount = 0;

  private final Set<Edge<Record>> processedEdges = new HashSet<>();

  private final Set<Node<Record>> processedNodes = new HashSet<>();

  // private final Set<Node<Record>> processedNodes = new HashSet<>();

  private final LongValue total = new LongValue();

  private void addDownstreamLength(final Edge<Record> downstreanEdge) {
    if (this.processedEdges.add(downstreanEdge)) {
      final NetworkCleanupRecord downstreamRecord = (NetworkCleanupRecord)downstreanEdge
        .getObject();
      final long length = Math.round(downstreamRecord.getLength() * 1000);
      this.total.addValue(length);
      if (!downstreanEdge.isLoop()) {
        final Node<Record> fromNode = downstreanEdge.getFromNode();
        addDownstreamLength(fromNode);
      }
    }
  }

  private void addDownstreamLength(final Node<Record> node) {
    node.forEachInEdge(this::addDownstreamLength);
  }

  private void addUpstreamLength(final Edge<Record> upstreamEdge) {
    if (this.processedEdges.add(upstreamEdge)) {
      final NetworkCleanupRecord upstreamRecord = (NetworkCleanupRecord)upstreamEdge.getObject();
      final long length = Math.round(upstreamRecord.getLength() * 1000);
      this.total.addValue(length);
      if (!upstreamEdge.isLoop()) {
        final Node<Record> oppositeNode = upstreamEdge.getToNode();
        addUpstreamLength(oppositeNode);
      }
    }
  }

  private void addUpstreamLength(final Node<Record> node) {
    node.forEachOutEdge(this::addUpstreamLength);
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
      .setWhereCondition(Q.like(FWA_WATERSHED_CODE, "300%")) //
    // .addOrderBy(FWA_WATERSHED_CODE) //
    // .addOrderBy(LOCAL_WATERSHED_CODE) //
    ;
    try (
      RecordReader reader = this.recordStore.getRecords(query)) {
      for (final Record record : reader) {
        logCount(message);
        final NetworkCleanupRecord networkCleanupRecord = new NetworkCleanupRecord(record);
        if ("999".equals(networkCleanupRecord.getWatershedCode())) {
          networkCleanupRecord.setDownstreamLength(0);
          networkCleanupRecord.setUpstreamLength(0);
          updateRecord(networkCleanupRecord);
        } else {
          graph.addEdge(networkCleanupRecord);
        }
      }
    }
    logTotal(message);
    return graph;
  }

  private void routePathsProcess(final Node<Record> node) {
    if (node.getInEdgeCount() == 0) {
      logCount("Outlet");
      this.processedNodes.clear();
      final int x = (int)Math.round(node.getX() * 1000);
      final int y = (int)Math.round(node.getY() * 1000);
      final int currentBlueLineKey = -1;
      final BinaryRoutePath route = new BinaryRoutePath(x, y);
      routePathsProcessEdges(route, currentBlueLineKey, node);
    }
  }

  private void routePathsProcess(final RecordGraph graph) {
    graph.forEachNode(this::routePathsProcess);
    System.out.println(NetworkCleanupRecord.maxRouteCount);
    System.out.println(NetworkCleanupRecord.maxRouteLength);
    logTotal("Outlet");
  }

  private void edgeRoutesProcess(final Edge<Record> edge) {
    final List<Set<Edge<Record>> edgeRoutes
  }

  private void edgeRoutesProcess(final RecordGraph graph) {
    graph.forEachEdge(this::edgeRoutesProcess);
    System.out.println(NetworkCleanupRecord.maxRouteCount);
    System.out.println(NetworkCleanupRecord.maxRouteLength);
    logTotal("Outlet");
  }

  private void routePathsProcessEdges(final BinaryRoutePath route, final int currentBlueLineKey,
    final Node<Record> fromNode) {
    if (this.processedNodes.add(fromNode)) {
      final int outEdgeCount = fromNode.getOutEdgeCount();
      if (outEdgeCount == 0) {
        Debug.noOp();
      } else {
        final Edge<Record> edge1 = fromNode.getOutEdge(0);
        final NetworkCleanupRecord record1 = edge1.getEdgeObject();
        final boolean add1 = record1.addRoute(route);
        final int blueLineKey1 = record1.getBlueLineKey();
        if (outEdgeCount == 1) {
          if (add1) {
            final BinaryRoutePath nextRoute = route.appendEdge(false);
            final Node<Record> toNode = edge1.getToNode();
            routePathsProcessEdges(nextRoute, blueLineKey1, toNode);
          }
        } else if (outEdgeCount == 2) {
          final Edge<Record> edge2 = fromNode.getOutEdge(1);
          final NetworkCleanupRecord record2 = edge2.getEdgeObject();
          final boolean add2 = record2.addRoute(route);
          final int blueLineKey2 = record2.getBlueLineKey();

          boolean edge1Primary = true;
          if (currentBlueLineKey < 0) {
            final String watershedCode1 = record1.getWatershedCode();
            final String watershedCode2 = record2.getWatershedCode();
            int compare = watershedCode1.compareTo(watershedCode2);
            if (compare == 0) {
              final String localWatershedCode1 = record1.getLocalWatershedCode();
              final String localWatershedCode2 = record2.getLocalWatershedCode();
              compare = localWatershedCode1.compareTo(localWatershedCode2);
            }
            edge1Primary = compare <= 0;
          } else if (blueLineKey1 == currentBlueLineKey) {
            if (blueLineKey2 == currentBlueLineKey) {
              Debug.noOp();
            } else {
              edge1Primary = true;
            }
          } else if (blueLineKey2 == currentBlueLineKey) {
            edge1Primary = false;
          } else {
            Debug.noOp();
          }
          if (add1 != add2) {
            Debug.noOp();
          }
          final BinaryRoutePath nextRoute1 = route.appendEdge(!edge1Primary);
          final Node<Record> toNode1 = edge1.getToNode();

          final BinaryRoutePath nextRoute2 = route.appendEdge(edge1Primary);
          final Node<Record> toNode2 = edge2.getToNode();

          // Always process primary first
          if (edge1Primary) {
            if (add1) {
              routePathsProcessEdges(nextRoute1, blueLineKey1, toNode1);
            }
            if (add2) {
              routePathsProcessEdges(nextRoute2, blueLineKey2, toNode2);
            }
          } else {
            if (add2) {
              routePathsProcessEdges(nextRoute2, blueLineKey2, toNode2);
            }
            if (add1) {
              routePathsProcessEdges(nextRoute1, blueLineKey1, toNode1);
            }
          }
        } else {
          throw new RuntimeException("Cannot have more than 2 edges");
        }
      }
    } else {
      // System.err.println(fromNode);
    }
  }

  private void run() {
    final RecordGraph graph = newGraph();
    routePathsProcess(graph);
    // setDownstreamAndUpstreamLengths(graph);
    // updateRecords(graph);
  }

  private void setDownstreamAndUpstreamLengths(final RecordGraph graph) {
    final String message = "Calculate Lengths";
    graph.forEachEdge(edge -> {
      logCount(message);

      final NetworkCleanupRecord record = (NetworkCleanupRecord)edge.getObject();

      this.processedEdges.clear();
      this.total.value = 0;
      final Node<Record> fromNode = edge.getFromNode();
      addDownstreamLength(fromNode);
      record.setDownstreamLength(this.total.value / 1000.0);

      this.processedEdges.clear();
      this.total.value = 0;
      final Node<Record> toNode = edge.getToNode();
      addUpstreamLength(toNode);
      record.setUpstreamLength(this.total.value / 1000.0);
    });
    logTotal(message);
  }

  private void updateRecord(final NetworkCleanupRecord record) {
    boolean updated = false;
    if (record.isModified()) {
      updated = true;
      final int id = record.getId();
      final double downstreamLength = record.getDownstreamLength();
      final double upstreamLength = record.getUpstreamLength();
      try (
        Transaction transaction = this.recordStore.newTransaction()) {
        JdbcUtils.executeUpdate(this.recordStore, UPDATE_SQL, downstreamLength, upstreamLength, id);
      } catch (final Exception e) {
        Debug.noOp();
      }
    }
    if (record.isRouteModified()) {
      updated = true;
      final int id = record.getId();
      final List<byte[]> routes = record.getRoutes();
      try (
        Transaction transaction = this.recordStore.newTransaction();
        final JdbcConnection connection = this.recordStore.getJdbcConnection()) {

        final LargeObjectManager lobManager = connection.unwrap(org.postgresql.PGConnection.class)
          .getLargeObjectAPI();

        final Object[] blobs = new Object[routes.size()];
        for (int i = 0; i < blobs.length; i++) {
          final byte[] bytes = routes.get(i);

          final long oid = lobManager.createLO(LargeObjectManager.READ | LargeObjectManager.WRITE);

          // Open the large object for writing
          final LargeObject blob = lobManager.open(oid, LargeObjectManager.WRITE);
          try {
            final OutputStream outputStream = blob.getOutputStream();
            outputStream.write(bytes);
          } finally {
            blob.close();
          }
          blobs[i] = oid;
        }
        final Array routeArray = connection.createArrayOf("oid", blobs);
        final PreparedStatement statement = connection.prepareStatement(ROUTE_UPDATE_SQL);
        try {
          statement.setArray(1, routeArray);
          statement.setInt(2, id);
          statement.executeUpdate();
        } finally {
          JdbcUtils.close(statement);
        }

      } catch (final SQLException | IOException e) {
        Logs.error(this, e);
        throw Exceptions.wrap(e);
      }
    }
    if (updated && ++this.updateCount % 50000 == 0) {
      System.out.println("Update records\t" + this.updateCount);
    }

  }

  private void updateRecords(final RecordGraph graph) {
    graph.forEachEdge(edge -> {
      final NetworkCleanupRecord record = (NetworkCleanupRecord)edge.getObject();
      updateRecord(record);
    });
    System.out.println("Update records\t" + this.updateCount);
  }

}
