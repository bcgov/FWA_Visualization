package ca.bc.gov.fwa.convert;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.atomic.AtomicInteger;

import ca.bc.gov.fwa.FwaController;

import com.revolsys.collection.map.IntHashMap;
import com.revolsys.datatype.DataTypes;
import com.revolsys.geometry.model.BoundingBox;
import com.revolsys.geometry.model.GeometryFactory;
import com.revolsys.geometry.model.LineString;
import com.revolsys.io.PathName;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.io.RecordWriter;
import com.revolsys.record.schema.RecordDefinition;
import com.revolsys.record.schema.RecordDefinitionBuilder;
import com.revolsys.record.schema.RecordStore;
import com.revolsys.record.schema.RecordStoreSchema;
import com.revolsys.util.Dates;
import com.revolsys.util.Debug;

public class FwaTiles {
  private static final int COORDINATE_SYSTEM_ID = 3857;

  private static final String LOCAL_WATERSHED_CODE = "LOCAL_WATERSHED_CODE";

  private static final String LINEAR_FEATURE_ID = "LINEAR_FEATURE_ID";

  private static final GeometryFactory GEOMETRY_FACTORY = GeometryFactory
    .fixed2d(COORDINATE_SYSTEM_ID, 1000.0, 1000.0);

  private static final String WATERSHED_CODE = "WATERSHED_CODE";

  private static final int TILE_SIZE = 10000;

  public static void main(final String[] args) {
    new FwaTiles().run();
  }

  private final IntHashMap<IntHashMap<RecordWriter>> writersByTileYAndX = new IntHashMap<>();

  private final RecordDefinition streamRecordDefinition = new RecordDefinitionBuilder(
    PathName.newPathName("/FWA_STREAM_TILE")) //
      .addField(LINEAR_FEATURE_ID, DataTypes.INTEGER) //
      .addField(WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(LOCAL_WATERSHED_CODE, DataTypes.STRING, 143) //
      .addField(DataTypes.LINE_STRING) //
      .setGeometryFactory(GEOMETRY_FACTORY)//
      .getRecordDefinition();

  private final Path fwaPath = Paths.get(
    "/Volumes/bcgovdata/fwa/tiles/" + GEOMETRY_FACTORY.getCoordinateSystemId() + "/" + TILE_SIZE);

  public void closeWriters() {
    for (final IntHashMap<RecordWriter> writersByTileX : this.writersByTileYAndX.values()) {
      for (final RecordWriter writer : writersByTileX.values()) {
        writer.close();
      }
    }
    this.writersByTileYAndX.clear();
  }

  private RecordStore getStreamNetworkRecordStore() {
    return FwaController.getFileRecordStore("/Data/FWA/FWA_STREAM_NETWORKS_SP.gdb");
  }

  public RecordWriter getWriter(final int tileX, final int tileY) {
    IntHashMap<RecordWriter> writersByTileX = this.writersByTileYAndX.get(tileY);
    if (writersByTileX == null) {
      writersByTileX = new IntHashMap<>();
      this.writersByTileYAndX.put(tileY, writersByTileX);
      final Path rowPath = this.fwaPath.resolve(Integer.toString(tileY));
      com.revolsys.io.file.Paths.createDirectories(rowPath);
    }

    RecordWriter writer = writersByTileX.get(tileX);
    if (writer == null) {
      final Path rowPath = this.fwaPath.resolve(Integer.toString(tileY));
      final Path tilePath = rowPath.resolve(tileX + ".tsv");
      writer = RecordWriter.newRecordWriter(this.streamRecordDefinition, tilePath);
      writersByTileX.put(tileX, writer);
    }
    return writer;
  }

  private Record newStream(final Record record) {

    final Record stream = this.streamRecordDefinition.newRecord();
    stream.setValue(LINEAR_FEATURE_ID, record, LINEAR_FEATURE_ID);

    String watershedCode = record.getString(FwaController.FWA_WATERSHED_CODE);
    if (watershedCode == null) {
      watershedCode = "";
    } else {
      watershedCode = watershedCode.replaceAll("(-000000)+$", "");
      stream.setValue(WATERSHED_CODE, watershedCode.intern());
    }

    String localWatershedCode = record.getString(LOCAL_WATERSHED_CODE);
    if (localWatershedCode != null) {
      localWatershedCode = localWatershedCode.replaceAll("(-000000)+$", "");
      if (localWatershedCode.startsWith(watershedCode)) {
        final int length = watershedCode.length();
        if (length == localWatershedCode.length()) {
          localWatershedCode = "";
        } else {
          localWatershedCode = localWatershedCode.substring(length + 1);
        }
      } else {
        Debug.noOp();
      }
      if (localWatershedCode.length() > 0) {
        stream.setValue(LOCAL_WATERSHED_CODE, localWatershedCode.intern());
      }
    }

    final LineString sourceLine = record.getGeometry();
    final LineString line = GEOMETRY_FACTORY.lineString(sourceLine);
    stream.setGeometryValue(line);
    return stream;
  }

  private void readRecords() {
    long startTime = System.currentTimeMillis();
    final AtomicInteger count = new AtomicInteger();

    try (
      final RecordStore recordStore = getStreamNetworkRecordStore()) {
      final RecordStoreSchema rootSchema = recordStore.getRootSchema();
      for (final RecordDefinition recordDefinition : rootSchema.getRecordDefinitions()) {
        final PathName pathName = recordDefinition.getPathName();
        if (!pathName.getName().startsWith("_")) {
          try (
            RecordReader reader = recordStore.getRecords(pathName)) {
            for (final Record record : reader) {
              if (count.incrementAndGet() % 50000 == 0) {
                System.out.println(count);
              }
              final Record tileRecord = newStream(record);
              final LineString line = tileRecord.getGeometry();
              final BoundingBox boundingBox = line.getBoundingBox();
              final int minX = (int)Math.floor(boundingBox.getMinX() / TILE_SIZE) * TILE_SIZE;
              final int minY = (int)Math.floor(boundingBox.getMinY() / TILE_SIZE) * TILE_SIZE;
              final double maxX = boundingBox.getMaxX();
              final double maxY = boundingBox.getMaxY();
              for (int tileY = minY; tileY < maxY; tileY += TILE_SIZE) {
                for (int tileX = minX; tileX < maxX; tileX += TILE_SIZE) {
                  final RecordWriter writer = getWriter(tileX, tileY);
                  writer.write(tileRecord);
                }
              }
            }
          }
        }
      }
      closeWriters();
    }
    startTime = Dates.printEllapsedTime("read: " + count, startTime);
  }

  private void run() {
    readRecords();

  }
}
