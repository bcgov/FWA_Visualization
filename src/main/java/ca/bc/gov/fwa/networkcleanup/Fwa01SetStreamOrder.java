package ca.bc.gov.fwa.networkcleanup;

import java.util.Map;
import java.util.TreeMap;

import ca.bc.gov.fwa.FwaController;
import ca.bc.gov.fwa.convert.FwaConstants;

import com.revolsys.jdbc.JdbcUtils;
import com.revolsys.jdbc.io.JdbcRecordStore;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.query.Query;
import com.revolsys.transaction.Transaction;

public class Fwa01SetStreamOrder implements FwaConstants {

  private static final int LOG_STEP = 50000;

  public static void main(final String[] args) {
    new Fwa01SetStreamOrder().run();
  }

  private final JdbcRecordStore recordStore = (JdbcRecordStore)FwaController.getFwaRecordStore();

  private int count = 0;

  private int updateCount = 0;

  private void logCount(final String message) {
    if (++this.count % LOG_STEP == 0) {
      System.out.println(message + "\t" + this.count);
    }
  }

  private void logTotal(final String message) {
    System.out.println(message + "\t" + this.count);
    this.count = 0;
  }

  private void run() {
    final Query query = new Query(FWA_RIVER_NETWORK) //
      .setFieldNames(BLUE_LINE_KEY, STREAM_ORDER) //
      .setSql(
        "SELECT BLUE_LINE_KEY, MAX(STREAM_ORDER) FROM FWA.FWA_RIVER_NETWORK GROUP BY BLUE_LINE_KEY ORDER BY BLUE_LINE_KEY");
    ;

    final Map<Integer, Integer> streamOrderByBlueLineKey = new TreeMap<>();
    try (
      RecordReader reader = this.recordStore.getRecords(query)) {
      for (final Record record : reader) {
        // logCount("Read");
        final int blueLineKey = record.getInteger(BLUE_LINE_KEY);
        final int streamOrder = record.getInteger(STREAM_ORDER);

        streamOrderByBlueLineKey.put(blueLineKey, streamOrder);
      }
    }

    try (
      RecordReader reader = this.recordStore.getRecords(FWA_RIVER_NETWORK)) {
      for (final Record record : reader) {
        this.count++;
        final int blueLineKey = record.getInteger(BLUE_LINE_KEY);
        final int streamOrder = record.getInteger(BLUE_LINE_KEY_STREAM_ORDER, -1);
        final int maxStreamOrder = streamOrderByBlueLineKey.get(blueLineKey);
        if (maxStreamOrder != streamOrder) {
          try (
            Transaction transaction = this.recordStore.newTransaction()) {
            final int id = record.getInteger(LINEAR_FEATURE_ID);
            JdbcUtils.executeUpdate(this.recordStore,
              "UPDATE FWA.FWA_RIVER_NETWORK SET BLUE_LINE_KEY_STREAM_ORDER = ? WHERE LINEAR_FEATURE_ID = ?",
              maxStreamOrder, id);
          }
          if (++this.updateCount % LOG_STEP == 0) {
            System.out.println("Update\t" + this.updateCount + "\t" + this.count);
          }
        }

      }
    }

    System.out.println("Update\t" + this.updateCount + "\t" + this.count);
  }

}
