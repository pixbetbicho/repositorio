{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.postgresql
  ];
  env = {
    DATABASE_URL = "$DATABASE_URL";
  };
}