package ca.bc.gov.fwa.networkcleanup;

import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.TreeMap;

import ca.bc.gov.fwa.FwaController;
import ca.bc.gov.fwa.convert.FwaConstants;

import com.revolsys.collection.map.Maps;
import com.revolsys.jdbc.JdbcUtils;
import com.revolsys.jdbc.io.JdbcRecordStore;
import com.revolsys.record.Record;
import com.revolsys.record.io.RecordReader;
import com.revolsys.record.query.Q;
import com.revolsys.record.query.Query;
import com.revolsys.transaction.Transaction;

public class FwaSetNames implements FwaConstants {

  private static final int LOG_STEP = 1000;

  public static void main(final String[] args) {
    new FwaSetNames().run();
  }

  private final JdbcRecordStore recordStore = (JdbcRecordStore)FwaController.getFwaRecordStore();

  private int count = 0;

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
      .setDistinct(true) //
      .setFieldNames(BLUE_LINE_KEY, GNIS_ID, GNIS_NAME) //
      .setWhereCondition(Q.isNotNull(GNIS_NAME)) //
      .addOrderBy(BLUE_LINE_KEY) //
      .addOrderBy(GNIS_ID);

    final Map<Integer, List<Record>> nameByBlueLineKey = new TreeMap<>();
    try (
      RecordReader reader = this.recordStore.getRecords(query)) {
      for (final Record record : reader) {
        // logCount("Read");
        final int blueLineKey = record.getInteger(BLUE_LINE_KEY);
        Maps.addToList(nameByBlueLineKey, blueLineKey, record);

      }
    }

    for (final Entry<Integer, List<Record>> entry : nameByBlueLineKey.entrySet()) {
      final int blueLineKey = entry.getKey();
      final List<Record> names = entry.getValue();
      if (names.size() == 1) {
        final Record name = names.get(0);
        final int gnisId = name.getInteger(GNIS_ID);
        final String gnisName = name.getString(GNIS_NAME);

        try (
          Transaction transaction = recordStore.newTransaction()) {
          final String sql = "UPDATE FWA.FWA_RIVER_NETWORK SET GNIS_ID = ?, GNIS_NAME = ? WHERE BLUE_LINE_KEY = ? AND GNIS_ID IS NULL AND GNIS_NAME IS NULL";
          final int updateCount = JdbcUtils.executeUpdate(this.recordStore, sql, gnisId, gnisName,
            blueLineKey);
          if (updateCount > 0) {
            System.out.println(blueLineKey + "\t" + gnisName + "\t" + updateCount);
          }
        }
      } else {
        System.err.println(names);
      }
    }
    logTotal("Read");
  }

}
