package ca.bc.gov.fwa.load;

import ca.bc.gov.fwa.FwaController;
import ca.bc.gov.fwa.convert.FwaConstants;

import com.revolsys.record.io.RecordReader;
import com.revolsys.record.query.Query;
import com.revolsys.record.schema.RecordStore;

public class FwaCalculateLengths implements FwaConstants {

  public static void main(final String[] args) {
    new FwaCalculateLengths().run();
  }

  private final RecordStore recordStore = FwaController.getFwaRecordStore();

  private void run() {
    final Query query = new Query(FWA_RIVER_NETWORK) //
      .addOrderBy(FWA_WATERSHED_CODE) //
      .addOrderBy(LOCAL_WATERSHED_CODE);
    try (
      RecordReader reader = this.recordStore.getRecords(query)) {
      reader.setProperty("internStrings", true);
    }
  }

}
