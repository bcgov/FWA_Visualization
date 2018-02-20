package ca.bc.gov.fwa.networkcleanup;

import java.util.Arrays;
import java.util.List;

import ca.bc.gov.fwa.convert.FwaConstants;

import com.revolsys.datatype.DataTypes;
import com.revolsys.geometry.model.Geometry;
import com.revolsys.geometry.model.LineString;
import com.revolsys.record.AbstractRecord;
import com.revolsys.record.Record;
import com.revolsys.record.RecordState;
import com.revolsys.record.schema.RecordDefinition;
import com.revolsys.record.schema.RecordDefinitionBuilder;
import com.revolsys.util.number.Doubles;

public class NetworkCleanupRecord extends AbstractRecord implements FwaConstants {

  public static List<String> FWA_FIELD_NAMES = Arrays.asList(LINEAR_FEATURE_ID, FWA_WATERSHED_CODE,
    LOCAL_WATERSHED_CODE, LENGTH_METRE, DOWNSTREAM_LENGTH, UPSTREAM_LENGTH, GEOMETRY);

  public static final RecordDefinition RECORD_DEFINITION = new RecordDefinitionBuilder(
    "/fwa_network_cleanup") //
      .addField("id", DataTypes.LONG) //
      .addField("watershedCode", DataTypes.STRING) //
      .addField("localWatershedCode", DataTypes.STRING) //
      .addField("length", DataTypes.DOUBLE) //
      .addField("downstreamLength", DataTypes.DOUBLE) //
      .addField("upstreamLength", DataTypes.DOUBLE) //
      .setGeometryFieldName("line") //
      .setGeometryFactory(GEOMETRY_FACTORY) //
      .getRecordDefinition();

  private final int id;

  private final String watershedCode;

  private final String localWatershedCode;

  private final double length;

  private double downstreamLength;

  private double upstreamLength;

  private RecordState state;

  private final LineString line;

  private boolean processed = false;

  public NetworkCleanupRecord(final Record record) {
    this.id = record.getInteger(LINEAR_FEATURE_ID);
    this.watershedCode = record.getString(FWA_WATERSHED_CODE).intern();
    String localCode = record.getString(LOCAL_WATERSHED_CODE);
    if (localCode != null) {
      localCode = localCode.intern();
    }
    this.localWatershedCode = localCode;
    this.length = Doubles.makePrecise(1000, record.getDouble(LENGTH_METRE));
    this.downstreamLength = record.getDouble(DOWNSTREAM_LENGTH, 0);
    this.upstreamLength = record.getDouble(UPSTREAM_LENGTH, 0);
    this.line = record.getGeometry();
    this.state = RecordState.PERSISTED;
  }

  public double getDownstreamLength() {
    return this.downstreamLength;
  }

  @SuppressWarnings("unchecked")
  @Override
  public <T extends Geometry> T getGeometry() {
    return (T)this.line;
  }

  public int getId() {
    return this.id;
  }

  public double getLength() {
    return this.length;
  }

  public LineString getLine() {
    return this.line;
  }

  public String getLocalWatershedCode() {
    return this.localWatershedCode;
  }

  @Override
  public RecordDefinition getRecordDefinition() {
    return RECORD_DEFINITION;
  }

  @Override
  public RecordState getState() {
    return this.state;
  }

  public double getUpstreamLength() {
    return this.upstreamLength;
  }

  public String getWatershedCode() {
    return this.watershedCode;
  }

  public boolean isProcessed() {
    return this.processed;
  }

  public void resetLengths() {
    this.downstreamLength = 0;
    this.upstreamLength = 0;
  }

  public void setDownstreamLength(final double downstreamLength) {
    if (this.downstreamLength != downstreamLength) {
      this.state = RecordState.MODIFIED;
      this.downstreamLength = downstreamLength;
    }
  }

  public void setProcessed(final boolean processed) {
    this.processed = processed;
  }

  public void setUpstreamLength(final double upstreamLength) {
    if (this.upstreamLength != upstreamLength) {
      this.state = RecordState.MODIFIED;
      this.upstreamLength = upstreamLength;
    }
  }
}
