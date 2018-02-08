drop table fwa.fwa_river_network;
CREATE TABLE fwa.fwa_river_network (
  LINEAR_FEATURE_ID          int,
  WATERSHED_GROUP_ID         int,
  EDGE_TYPE                  int,
  BLUE_LINE_KEY              int,
  WATERSHED_KEY              int,
  FWA_WATERSHED_CODE         varchar(143),
  LOCAL_WATERSHED_CODE       varchar(143),
  WATERSHED_GROUP_CODE       varchar(4),
  DOWNSTREAM_ROUTE_MEASURE   double precision,
  LENGTH_METRE               double precision,
  FEATURE_SOURCE             varchar(15),
  GNIS_ID                    int,
  GNIS_NAME                  varchar(80),
  LEFT_RIGHT_TRIBUTARY       varchar(7),
  STREAM_ORDER               int,
  STREAM_MAGNITUDE           int,
  WATERBODY_KEY              int,
  GRADIENT                   double precision,
  FEATURE_CODE               varchar(10),
  UPSTREAM_ROUTE_MEASURE     double precision,
  GEOMETRY                   GEOMETRY(MultiLineString,3005),
  PRIMARY KEY (LINEAR_FEATURE_ID)
);

GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE on fwa.fwa_river_network TO gba_user;


CREATE INDEX fwa_river_network_SI ON fwa.fwa_river_network USING GIST (GEOMETRY);



CREATE INDEX fwa_river_network_stream_order ON fwa.fwa_river_network (STREAM_ORDER);
