package ca.bc.gov.fwa.convert;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import ca.bc.gov.fwa.FwaController;

import com.revolsys.collection.map.IntHashMap;
import com.revolsys.datatype.DataTypes;
import com.revolsys.geometry.graph.Edge;
import com.revolsys.geometry.graph.RecordGraph;
import com.revolsys.geometry.model.GeometryFactory;
import com.revolsys.geometry.model.LineString;
import com.revolsys.geometry.model.Point;
import com.revolsys.geometry.model.coordinates.LineSegmentUtil;
import com.revolsys.geometry.model.editor.LineStringEditor;
import com.revolsys.io.PathName;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.io.RecordWriter;
import com.revolsys.record.io.format.csv.CsvRecordWriter;
import com.revolsys.record.query.Q;
import com.revolsys.record.query.Query;
import com.revolsys.record.schema.RecordDefinition;
import com.revolsys.record.schema.RecordDefinitionBuilder;
import com.revolsys.record.schema.RecordStore;
import com.revolsys.util.Debug;
import com.revolsys.util.MathUtil;
import com.revolsys.value.DoubleValue;

public class FwaMergeRecords implements FwaConstants {
  private static final int COORDINATE_SYSTEM_ID = 3857;

  private static final GeometryFactory GEOMETRY_FACTORY = GeometryFactory
    .fixed2d(COORDINATE_SYSTEM_ID, 1000.0, 1000.0);

  public static void main(final String[] args) {
    new FwaMergeRecords().run();
  }

  private final IntHashMap<IntHashMap<IntHashMap<CsvRecordWriter>>> writersByTileSizeYAndX = new IntHashMap<>();

  private final RecordDefinition fwaVisualizationRecordDefinition = new RecordDefinitionBuilder(
    PathName.newPathName("/FWA_STREAM_TILE")) //
      .addField(LINEAR_FEATURE_ID, DataTypes.INTEGER) //
      .addField(FWA_WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(LOCAL_WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(DataTypes.LINE_STRING) //
      .setGeometryFactory(GEOMETRY_FACTORY)//
      .getRecordDefinition();

  private final Path fwaPath = Paths
    .get("/Data/FWA/tiles/" + GEOMETRY_FACTORY.getCoordinateSystemId());

  private final RecordStore recordStore = FwaController.getFwaRecordStore();

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

  private void mergeBc() {
    final Path file = this.fwaPath //
      .resolve("bc.tsv");

    final Query query = new Query(FWA_RIVER_NETWORK) //
      .setWhereCondition(Q.greaterThanEqual(STREAM_ORDER, 7));
    try (
      RecordReader reader = this.recordStore.getRecords(query)) {
      writeMergedRecords(file, reader);
    }
  }

  private void mergeTile(final Path basePath, final int tileX, final int tileY) {
    final Path tilePath = basePath //
      .resolve(Integer.toString(tileX)) //
      .resolve(tileY + ".tsv");
    final Path tilePathNew = basePath //
      .resolve(Integer.toString(tileX)) //
      .resolve(tileY + "_new.tsv");

    try (
      RecordReader reader = RecordReader.newRecordReader(tilePath)) {
      writeMergedRecords(tilePathNew, reader);
    }
  }

  private void run() {
    // final Path basePath = this.fwaPath.resolve(Integer.toString(1000000));
    // mergeTile(basePath, -15000000, 7000000);
    mergeBc();
  }

  private void writeMergedRecords(final Path file, final Iterable<Record> records) {
    final RecordGraph graph = new RecordGraph(records);
    final int recordCount = graph.getEdgeCount();
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
              graph.merge(node, edge1, edge2);
            } else {
              Debug.noOp();
            }
          }
        }
      }
    });
    System.out.println(recordCount);

    try (
      RecordWriter writer = RecordWriter.newRecordWriter(this.fwaVisualizationRecordDefinition, file)) {
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
              if (offset > 0) {
                Debug.noOp();
              }
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
    System.out.println(graph.getEdgeCount());
  }
}
