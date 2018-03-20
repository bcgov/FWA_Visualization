package ca.bc.gov.fwa.networkcleanup;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
import com.revolsys.util.Debug;

public class Fwa20SetLocalCodes implements FwaConstants {

  private static final int LOG_STEP = 100000;

  private static final String SET_LOCAL_CODE = "Set local code";

  public static void main(final String[] args) {
    new Fwa20SetLocalCodes().run();
  }

  private final JdbcRecordStore recordStore = (JdbcRecordStore)FwaController.getFwaRecordStore();

  private int count = 0;

  private final Set<Node<Record>> processedNodes = new HashSet<>();

  private final Set<Integer> processedBlueLineKeys = new HashSet<>();

  public String getMinWatershedCode(final Node<Record> node) {
    String minWatershedCode = "AAA";
    for (int i = 0; i < node.getOutEdgeCount(); i++) {
      final Edge<Record> edge = node.getEdge(i);
      final NetworkCleanupRecord record = edge.getEdgeObject();
      final String watershedCode = record.getWatershedCode();
      if (watershedCode.compareTo(minWatershedCode) < 0) {
        minWatershedCode = watershedCode;
      }
    }
    return minWatershedCode;
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
      // .setWhereCondition(Q.like(FWA_WATERSHED_CODE, "100%"))
      .setFieldNames(NetworkCleanupRecord.FWA_FIELD_NAMES) //
    ;
    try (
      RecordReader reader = this.recordStore.getRecords(query)) {
      for (final Record record : reader) {
        logCount(message);
        final NetworkCleanupRecord networkCleanupRecord = new NetworkCleanupRecord(record);
        if (!"999".equals(networkCleanupRecord.getWatershedCode())) {
          graph.addEdge(networkCleanupRecord);
        }
      }
    }
    logTotal(message);
    return graph;
  }

  private void routePathsProcessEdges(final Node<Record> fromNode, final String watershedCode,
    final String localCode) {
    final int outEdgeCount = fromNode.getOutEdgeCount();
    if (outEdgeCount == 0) {
    } else if (this.processedNodes.add(fromNode)) {
      final Edge<Record> edge1 = fromNode.getOutEdge(0);
      final Node<Record> toNode1 = edge1.getToNode();
      final NetworkCleanupRecord record1 = edge1.getEdgeObject();
      final String watershedCode1 = record1.getWatershedCode();
      String localCode1 = record1.getLocalWatershedCode();
      final boolean process1 = watershedCode1.startsWith(watershedCode);
      if (outEdgeCount == 1) {
        if (watershedCode.equals(watershedCode1)) {
          if (localCode != null && localCode1 == null) {
            localCode1 = updateRecord(record1, localCode);
          }
          routePathsProcessEdges(toNode1, watershedCode1, localCode1);
        } else if (process1) {
          routePathsProcessEdges(toNode1, watershedCode1, localCode1);
        } else {
          // Terminate processing of this route if it connects back into another stream
          Debug.noOp();
        }
      } else if (outEdgeCount == 2) {
        final Edge<Record> edge2 = fromNode.getOutEdge(1);
        final Node<Record> toNode2 = edge2.getToNode();
        final NetworkCleanupRecord record2 = edge2.getEdgeObject();
        final String watershedCode2 = record2.getWatershedCode();
        String localCode2 = record2.getLocalWatershedCode();
        final boolean process2 = watershedCode2.startsWith(watershedCode);

        if (watershedCode1.equals(watershedCode2)) {
          if (localCode1 == null) {
            if (localCode2 == null) {
              if (localCode == null) {
                Debug.noOp();
              } else {
                localCode1 = updateRecord(record1, localCode);
                localCode2 = updateRecord(record2, localCode);
              }

            } else {
              localCode1 = updateRecord(record1, localCode2);
            }
          } else if (localCode2 == null) {
            localCode2 = updateRecord(record2, localCode1);
          }
        } else if (localCode != null) {
          if (watershedCode.equals(watershedCode1)) {
            if (localCode1 == null) {
              localCode1 = updateRecord(record1, localCode);
            }
          } else if (watershedCode.equals(watershedCode2)) {
            if (localCode2 == null) {
              localCode2 = updateRecord(record2, localCode);
            }
          }
        } else {
          if (localCode1 == null && watershedCode.startsWith(watershedCode1 + "-")) {
            final String newLocalCode = watershedCode.substring(watershedCode1.length() + 1);
            localCode1 = updateRecord(record1, newLocalCode);
          }
          if (localCode2 == null && watershedCode.startsWith(watershedCode2 + "-")) {
            final String newLocalCode = watershedCode.substring(watershedCode2.length() + 1);
            localCode2 = updateRecord(record2, newLocalCode);
          }
        }
        if (process1) {
          if (process2) {
            if (watershedCode1.compareTo(watershedCode2) < 0) {
              routePathsProcessEdges(toNode1, watershedCode1, localCode1);
              routePathsProcessEdges(toNode2, watershedCode2, localCode2);
            } else {
              routePathsProcessEdges(toNode2, watershedCode2, localCode2);
              routePathsProcessEdges(toNode1, watershedCode1, localCode1);
            }
          } else {
            routePathsProcessEdges(toNode1, watershedCode1, localCode1);
          }
        } else if (process2) {
          routePathsProcessEdges(toNode2, watershedCode2, localCode2);
        } else {
          Debug.noOp();
        }
      } else {
        throw new RuntimeException("Cannot have more than 2 edges");
      }
      // this.processedNodes.remove(fromNode);
    }

  }

  private void routeProcess(final Node<Record> node) {
    this.processedNodes.clear();
    this.processedBlueLineKeys.clear();
    final String watershedCode = "";
    final String localCode = null;
    routePathsProcessEdges(node, watershedCode, localCode);
  }

  private void routeProcess(final RecordGraph graph) {
    final List<Node<Record>> nodes = new ArrayList<>();
    graph.forEachNode(node -> {
      if (node.getInEdgeCount() == 0) {
        nodes.add(node);
      }
    });
    nodes.sort((a, b) -> {
      final String minWatershedCode1 = getMinWatershedCode(a);
      final String minWatershedCode2 = getMinWatershedCode(b);
      int compare = minWatershedCode1.compareTo(minWatershedCode2);
      if (compare == 0) {
        compare = a.compareTo(b);
      }
      return compare;
    });
    System.out.println("Start nodes\t" + nodes.size());
    nodes.forEach(this::routeProcess);
  }

  private void run() {
    final RecordGraph graph = newGraph();
    routeProcess(graph);
    logTotal(SET_LOCAL_CODE);
  }

  private String updateRecord(final NetworkCleanupRecord record, final String localCode) {
    logCount(SET_LOCAL_CODE);
    record.setLocalWatershedCode(localCode);
    final int id = record.getId();
    final String sql = "UPDATE FWA.FWA_RIVER_NETWORK SET LOCAL_WATERSHED_CODE = ? WHERE LINEAR_FEATURE_ID = ?";
    try (
      Transaction transaction = this.recordStore.newTransaction();
      JdbcConnection connection = this.recordStore.getJdbcConnection();
      PreparedStatement statement = connection.prepareStatement(sql);) {
      statement.setString(1, localCode);
      statement.setInt(2, id);
      statement.executeUpdate();
    } catch (final SQLException e) {
      throw new RuntimeException(e);
    }

    return localCode;
  }

}
