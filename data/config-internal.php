<?php
return [
  'database' => [
    'driver' => 'pdo_mysql',
    'host' => 'localhost',
    'port' => '',
    'charset' => 'utf8mb4',
    'dbname' => 'crm_com_wonderlong',
    'user' => 'crm_com_wonderlong_user',
    'password' => ']S2E7_*s]AxyC)Fz'
  ],
  'logger' => [
    'path' => 'data/logs/espo.log',
    'level' => 'WARNING',
    'rotation' => true,
    'maxFileNumber' => 30,
    'printTrace' => false
  ],
  'restrictedMode' => false,
  'webSocketMessager' => 'ZeroMQ',
  'isInstalled' => true,
  'microtimeInternal' => 1641533526.830922,
  'passwordSalt' => 'b61d2208a3021b53',
  'cryptKey' => '6549d78efdf0a5c6d0a93ce61abafe66',
  'hashSecretKey' => 'd0cabdc9149be8e2ab94506889621508',
  'defaultPermissions' => [
    'user' => 10002,
    'group' => 1004
  ],
  'actualDatabaseType' => 'mariadb',
  'actualDatabaseVersion' => '10.3.32'
];
