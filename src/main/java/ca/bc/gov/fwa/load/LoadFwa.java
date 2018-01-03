package ca.bc.gov.fwa.load;

import ca.bc.gov.fwa.FwaController;

import com.revolsys.record.Record;
import com.revolsys.record.Records;
import com.revolsys.record.schema.RecordStore;
import com.revolsys.transaction.Transaction;

public class LoadFwa {

  public static void main(final String[] args) {
    new LoadFwa().run();
  }

  public void cleanWatershedCode(final Record soruceRecord, final Record targetRecord) {
    String watershedCode = soruceRecord.getString(FwaController.FWA_WATERSHED_CODE);
    watershedCode = watershedCode.replaceAll("(-000000)+$", "");
    targetRecord.put(FwaController.FWA_WATERSHED_CODE, watershedCode);
  }

  private void run() {
    try (
      RecordStore fgdbRecordStore = FwaController.getFwaFgdbRecordStore();
      final RecordStore jdbcRecordStore = FwaController.getFwaRecordStore();) {
      try (
        Transaction transaction = jdbcRecordStore.newTransaction()) {
        Records.copyRecords(fgdbRecordStore, "/FWA_ROUTES_SP", jdbcRecordStore,
          FwaController.FWA_ROUTES_SP, this::cleanWatershedCode);
      }
    }
  }
}
