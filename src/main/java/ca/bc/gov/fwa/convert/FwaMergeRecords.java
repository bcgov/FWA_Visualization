package ca.bc.gov.fwa.convert;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

import ca.bc.gov.fwa.FwaController;

import com.revolsys.collection.map.IntHashMap;
import com.revolsys.datatype.DataTypes;
import com.revolsys.geometry.graph.Edge;
import com.revolsys.geometry.graph.RecordGraph;
import com.revolsys.geometry.model.BoundingBox;
import com.revolsys.geometry.model.GeometryFactory;
import com.revolsys.geometry.model.LineString;
import com.revolsys.geometry.model.Point;
import com.revolsys.geometry.model.coordinates.LineSegmentUtil;
import com.revolsys.geometry.model.editor.LineStringEditor;
import com.revolsys.geometry.util.OutCode;
import com.revolsys.io.PathName;
import com.revolsys.parallel.process.ProcessNetwork;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.io.RecordWriter;
import com.revolsys.record.io.format.csv.CsvRecordWriter;
import com.revolsys.record.io.format.tsv.Tsv;
import com.revolsys.record.query.Q;
import com.revolsys.record.query.Query;
import com.revolsys.record.query.functions.F;
import com.revolsys.record.schema.RecordDefinition;
import com.revolsys.record.schema.RecordDefinitionBuilder;
import com.revolsys.record.schema.RecordStore;
import com.revolsys.util.Debug;
import com.revolsys.util.IntPair;
import com.revolsys.util.MathUtil;
import com.revolsys.util.function.BiConsumerDouble;
import com.revolsys.util.function.Consumer4Double;
import com.revolsys.value.DoubleValue;

public class FwaMergeRecords implements FwaConstants {
  private static final String PATH = //
      // "/Data/FWA/tiles/"//
      "/Volumes/bcgovdata/fwa/tiles/" //
  ;

  private static final int COORDINATE_SYSTEM_ID = 3857;

  private static final GeometryFactory GEOMETRY_FACTORY = GeometryFactory
    .fixed2d(COORDINATE_SYSTEM_ID, 1000.0, 1000.0);

  public static void main(final String[] args) {
    new FwaMergeRecords().run();
  }

  private final IntHashMap<IntHashMap<IntHashMap<CsvRecordWriter>>> writersByTileSizeYAndX = new IntHashMap<>();

  private final RecordDefinition fwaVisualizationRecordDefinition = new RecordDefinitionBuilder(
    PathName.newPathName("/FWA_STREAM_TILE")) //
      .addField(LINEAR_FEATURE_ID, DataTypes.INT) //
      .addField(GNIS_ID, DataTypes.INT) //
      .addField(FWA_WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(MIN_LOCAL_WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(MAX_LOCAL_WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(DOWNSTREAM_ROUTE_MEASURE, DataTypes.DOUBLE) //
      .addField(UPSTREAM_ROUTE_MEASURE, DataTypes.DOUBLE) //
      .addField(LENGTH_METRE, DataTypes.DOUBLE) //
      .addField(DataTypes.LINE_STRING) //
      .setGeometryFactory(GEOMETRY_FACTORY)//
      .getRecordDefinition();

  private final RecordDefinition graphRecordDefinition = new RecordDefinitionBuilder(
    PathName.newPathName("/FWA_GRAPH")) //
      .addField(LINEAR_FEATURE_ID, DataTypes.INT) //
      .addField(BLUE_LINE_KEY, DataTypes.INT) //
      .addField(GNIS_ID, DataTypes.INT) //
      .addField(GNIS_NAME, DataTypes.STRING) //
      .addField(FWA_WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(MIN_LOCAL_WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(MAX_LOCAL_WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(DOWNSTREAM_ROUTE_MEASURE, DataTypes.DOUBLE) //
      .addField(UPSTREAM_ROUTE_MEASURE, DataTypes.DOUBLE) //
      .addField(LENGTH_METRE, DataTypes.DOUBLE) //
      .addField(DataTypes.LINE_STRING) //
      .setGeometryFactory(GEOMETRY_FACTORY)//
      .getRecordDefinition();

  private final Path fwaPath = Paths.get(PATH + GEOMETRY_FACTORY.getCoordinateSystemId());

  private final RecordStore recordStore = FwaController.getFwaRecordStore();

  private boolean canMerge(final String code1, final String code2) {
    return code1.length() == code2.length();
  }

  public void closeWriters() {
    for (final IntHashMap<IntHashMap<CsvRecordWriter>> writersByTileSize : this.writersByTileSizeYAndX
      .values()) {
      for (final IntHashMap<CsvRecordWriter> writersByTileX : writersByTileSize.values()) {
        for (final RecordWriter writer : writersByTileX.values()) {
          writer.close();
        }
      }
    }
    this.writersByTileSizeYAndX.clear();
  }

  private void graphMerge(final RecordGraph graph) {
    graph.forEachNode(node -> {
      if (node.getEdgeCount() == 2) {
        final List<Edge<Record>> edges = node.getEdges();
        if (edges.size() == 2) {
          final Edge<Record> edge1 = edges.get(0);
          final Edge<Record> edge2 = edges.get(1);
          final Record record1 = edge1.getObject();
          final Record record2 = edge2.getObject();
          if (record1.equalValue(record2, FWA_WATERSHED_CODE)) {
            if (record1.equalValue(record2, BLUE_LINE_KEY)) {
              final String minLocalWatershedCode1 = record1.getString(MIN_LOCAL_WATERSHED_CODE,
                "000000");
              final String minLocalWatershedCode2 = record2.getString(MIN_LOCAL_WATERSHED_CODE,
                "000000");
              if (canMerge(minLocalWatershedCode1, minLocalWatershedCode2)) {
                final String maxLocalWatershedCode1 = record1.getString(MAX_LOCAL_WATERSHED_CODE,
                  "000000");
                final String maxLocalWatershedCode2 = record2.getString(MAX_LOCAL_WATERSHED_CODE,
                  "000000");
                if (canMerge(maxLocalWatershedCode1, maxLocalWatershedCode2)) {
                  final Edge<Record> newEdge = graph.merge(node, edge1, edge2);
                  final Record newRecord = newEdge.getObject();

                  setMin(newRecord, LINEAR_FEATURE_ID, record1, record2);
                  setMin(newRecord, MIN_LOCAL_WATERSHED_CODE, record1, record2, "000000");
                  setMax(newRecord, MAX_LOCAL_WATERSHED_CODE, record1, record2, "000000");

                  final double length1 = record1.getDouble(LENGTH_METRE);
                  final double length2 = record2.getDouble(LENGTH_METRE);
                  newRecord.setValue(LENGTH_METRE, length1 + length2);

                  setMin(newRecord, DOWNSTREAM_ROUTE_MEASURE, record1, record2);
                  setMax(newRecord, UPSTREAM_ROUTE_MEASURE, record1, record2);
                }
              }
            } else {
              Debug.noOp();
            }
          }
        }
      }
    });
  }

  private RecordGraph graphNew(final Iterable<Record> records, final BoundingBox boundingBox) {
    final RecordGraph graph = new RecordGraph();
    final List<LineString> lines = new ArrayList<>();
    final LineStringEditor lineEditor = GEOMETRY_FACTORY.newLineStringBuilder();

    final BiConsumerDouble singleCrossAction = (x, y) -> {
      lineEditor.appendVertex(x, y, false);
      if (lineEditor.getVertexCount() == 1) {
      } else {
        lines.add(lineEditor.newGeometry());
        lineEditor.clear();
        lineEditor.appendVertex(x, y, false);
      }
    };

    final Consumer4Double doubleCrossAction = (x1, y1, x2, y2) -> {
      final LineStringEditor e = lineEditor;
      lineEditor.appendVertex(x1, y1, false);
      if (lineEditor.getVertexCount() > 1) {
        lines.add(lineEditor.newGeometry());
      }
      lines.add(GEOMETRY_FACTORY.lineString(2, x1, y1, x2, y2));
      lineEditor.clear();
      lineEditor.appendVertex(x2, y2, false);
    };
    for (final Record record : records) {
      final String localWatershedCode = record.getString(LOCAL_WATERSHED_CODE);

      final Record graphRecord = this.graphRecordDefinition.newRecord(record);
      final LineString sourceLine = record.getGeometry();
      final LineString graphLine = sourceLine.convertGeometry(GEOMETRY_FACTORY);
      graphRecord.setGeometryValue(graphLine);

      graphRecord.setValue(MIN_LOCAL_WATERSHED_CODE, localWatershedCode);
      graphRecord.setValue(MAX_LOCAL_WATERSHED_CODE, localWatershedCode);
      graphRecord.setGeometryValue(record);

      if (boundingBox == null) {
        graph.addEdge(graphRecord);
      } else {
        if (graphLine.intersects(boundingBox)) {
          if (boundingBox.covers(graphLine)) {
            graph.addEdge(graphRecord);
          } else {
            lines.clear();
            lineEditor.clear();
            lineEditor.appendVertex(graphLine, 0);

            graphLine.forEachSegment((x1, y1, x2, y2) -> {
              final int out1 = boundingBox.getOutcode(x1, y1);
              final int out2 = boundingBox.getOutcode(x2, y2);
              if ((out1 | out2) == 0) {
                // Both inside
              } else if ((out1 & out2) != 0) {
                // Both outside and non-crossing
              } else {
                if (OutCode.isInside(out1)) {
                  // Single crossing
                  boundingBox.outCodeIntersection(out2, x1, y1, x2, y2, singleCrossAction);
                } else if (OutCode.isInside(out2)) {
                  // Single crossing
                  boundingBox.outCodeIntersection(out1, x1, y1, x2, y2, singleCrossAction);
                } else {
                  boundingBox.outCodeIntersection(out1, out2, x1, y1, x2, y2, doubleCrossAction);

                }
              }
              lineEditor.appendVertex(x2, y2, false);
            });
            if (lineEditor.getVertexCount() > 1) {
              lines.add(lineEditor.newGeometry());
            }

            // final Geometry intersection = graphLine.intersection(tilePolygon);
            Debug.noOp();
          }
        }
      }
    }
    return graph;
  }

  private int graphWrite(final Path file, final RecordGraph graph) {
    try (
      RecordWriter writer = Tsv.newRecordWriter(this.fwaVisualizationRecordDefinition, file, false,
        false)) {
      graph.forEachObject(record -> {
        final Record stream = this.fwaVisualizationRecordDefinition.newRecord(record);
        final LineString line = record.getGeometry().convertGeometry(GEOMETRY_FACTORY);
        final LineStringEditor newLine = GEOMETRY_FACTORY.newLineStringBuilder();
        newLine.appendVertex(line.getX(0), line.getY(0));
        final DoubleValue segmentLength = new DoubleValue();
        line.forEachSegment((x1, y1, x2, y2) -> {
          final double length = MathUtil.distance(x1, y1, x2, y2);
          if (segmentLength.value + length > 2000) {
            double offset = 0;
            do {
              final double projectDistance = 2000 - segmentLength.value;
              offset += projectDistance;
              if (offset >= length) {
                newLine.appendVertex(x1, x2);
              } else {
                final double percent = offset / length;
                final Point point = LineSegmentUtil.project(x1, y1, x2, y2, percent);
                newLine.appendVertex(point);
                segmentLength.value = 0;
              }
            } while (offset + 2000 < length);
          } else {
            segmentLength.addValue(length);
          }
        });
        final int lastVertexIndex = line.getLastVertexIndex();
        newLine.appendVertex(line.getX(lastVertexIndex), line.getY(lastVertexIndex), false);
        stream.setGeometryValue(newLine);
        writer.write(stream);
      });
    }
    return graph.getEdgeCount();
  }

  private void mergeBc() {
    final Path file = this.fwaPath //
      .resolve("bc.tsv");

    final Query query = new Query(FWA_RIVER_NETWORK) //
      .setWhereCondition(Q.greaterThanEqual(STREAM_ORDER, 7));
    try (
      RecordReader reader = this.recordStore.getRecords(query)) {
      writeMergedRecords("BC", file, reader, null);
    }
  }

  private void mergeTile(final int tileX, final int tileY, final int tileSize,
    final int streamOrder) {
    final Path tilePath = this.fwaPath //
      .resolve(Integer.toString(tileSize)) //
      .resolve(Integer.toString(tileX)) //
      .resolve(tileY + ".tsv");
    com.revolsys.io.file.Paths.createParentDirectories(tilePath);
    final BoundingBox boundingBox = GEOMETRY_FACTORY //
      .newBoundingBox(tileX, tileY) //
      .expand(tileSize);
    final BoundingBox albersBoundingBox = boundingBox
      .convert(GeometryFactory.fixed(3005, 2, 1.0, 1.0));

    final Query query = new Query(FWA_RIVER_NETWORK) //
      .and(Q.greaterThanEqual(STREAM_ORDER, streamOrder)) //
      .and(F.envelopeIntersects("GEOMETRY", albersBoundingBox));
    try (
      RecordReader reader = this.recordStore.getRecords(query)) {
      writeMergedRecords(tileSize + "\t" + tileX + "\t" + tileY, tilePath, reader, boundingBox);
    }
  }

  private void mergeTiles(final int minStreamOrder, final int tileSize) {
    final LinkedList<IntPair> tileIds = new LinkedList<>();
    for (int tileY = 6000000; tileY <= 8000000; tileY += tileSize) {
      for (int tileX = -15000000; tileX <= -13000000; tileX += tileSize) {
        tileIds.add(new IntPair(tileX, tileY));
      }
    }
    final ProcessNetwork processNetwork = new ProcessNetwork();
    for (int i = 0; i < 4; i++) {
      processNetwork.addProcess(() -> {
        while (true) {
          IntPair tileId;
          synchronized (tileIds) {
            if (tileIds.isEmpty()) {
              return;
            } else {
              tileId = tileIds.removeFirst();
            }
          }
          final int tileX = tileId.getValue1();
          final int tileY = tileId.getValue2();
          mergeTile(tileX, tileY, tileSize, minStreamOrder);
        }
      });
    }
    processNetwork.startAndWait();
  }

  private void run() {
    mergeBc();
    mergeTiles(6, 1000000);
    mergeTiles(5, 500000);
    mergeTiles(4, 200000);
    mergeTiles(3, 100000);
    mergeTiles(2, 50000);
    mergeTiles(0, 20000);
  }

  private void setMax(final Record newRecord, final String fieldName, final Record record1,
    final Record record2) {
    final Comparable<Object> value1 = record1.getValue(fieldName);
    final Object value2 = record2.getValue(fieldName);
    if (value1.compareTo(value2) >= 0) {
      newRecord.setValue(fieldName, value1);
    } else {
      newRecord.setValue(fieldName, value2);
    }
  }

  @SuppressWarnings("unchecked")
  private void setMax(final Record newRecord, final String fieldName, final Record record1,
    final Record record2, final Object defaultValue) {
    final Comparable<Object> value1 = record1.getValue(fieldName, (Comparable<Object>)defaultValue);
    final Object value2 = record2.getValue(fieldName, defaultValue);
    if (value1.compareTo(value2) >= 0) {
      newRecord.setValue(fieldName, value1);
    } else {
      newRecord.setValue(fieldName, value2);
    }
  }

  private void setMin(final Record newRecord, final String fieldName, final Record record1,
    final Record record2) {
    final Comparable<Object> value1 = record1.getValue(fieldName);
    final Object value2 = record2.getValue(fieldName);
    if (value1.compareTo(value2) <= 0) {
      newRecord.setValue(fieldName, value1);
    } else {
      newRecord.setValue(fieldName, value2);
    }
  }

  @SuppressWarnings("unchecked")
  private void setMin(final Record newRecord, final String fieldName, final Record record1,
    final Record record2, final Object defaultValue) {
    final Comparable<Object> value1 = record1.getValue(fieldName, (Comparable<Object>)defaultValue);
    final Object value2 = record2.getValue(fieldName, defaultValue);
    if (value1.compareTo(value2) <= 0) {
      newRecord.setValue(fieldName, value1);
    } else {
      newRecord.setValue(fieldName, value2);
    }
  }

  private void writeMergedRecords(final String prefix, final Path file,
    final Iterable<Record> records, final BoundingBox boundingBox) {
    final RecordGraph graph = graphNew(records, boundingBox);
    final int recordCount = graph.getEdgeCount();
    graphMerge(graph);

    graphWrite(file, graph);
    final int writeCount = graph.getEdgeCount();
    System.out.println(prefix + "\t" + recordCount + "\t" + writeCount);
  }
}
