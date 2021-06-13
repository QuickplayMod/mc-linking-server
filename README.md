# Quickplay Minecraft Authentication Server
Launches a Minecraft server that, when users join, they will immediately be kicked with an authentication code that they
input separately to authenticate themselves. These codes get added to a database.

## Database Schema
Uses a MySQL database.

###mc_auth_codes

| Rows      | Type definition                     |
|-----------|-------------------------------------|
| code      | char(8) primary key                 |
| account   | int                                 |
| timestamp | timestamp default CURRENT_TIMESTAMP |

###accounts
| Rows        | Type definition                     |
|-------------|-------------------------------------|
| id          | int AUTO_INCREMENT primary key      |
| mc_uuid     | char(32)                            |
| first_login | timestamp default CURRENT_TIMESTAMP |


## Required Environment Variables

- `DB_HOST`
- `DB_USER`
- `DB_PASS`
- `DB_SCHEMA`

## Optional Environment Variables

- `SERVER_MOTD` - Default `§3Quickplay Authentication Server`
- `SERVER_KICK_MESSAGE` - Default `§7Your authentication code:\n§f§l%code%`
- `SERVER_ERROR_MESSAGE` - Default `§cSomething went wrong while generating a code!\n\n§7Please contact an administrator.`
- `SERVER_FAVICON_BASE64`
