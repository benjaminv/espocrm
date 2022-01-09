# copy over of official release/7.0.8
This is a downloaded copy of official release of [7.0.8](https://github.com/espocrm/espocrm/releases/tag/7.0.8)  
I have not build it by myself and it looks like a bit of work.

## Installation - don't use as out-dated
follow this guide:
https://docs.espocrm.com/administration/installation/

## Development
follow this guide:
https://docs.espocrm.com/development/how-to-start/

# Installation
## Permission Issues
Due to file ownership issues after download, `cd` to the file `root` folder and change owership to current user, for example:  

```ruby 
cd /Users/yourLocalUser/PhpstormProjects/CRM/crm-dev && 
sudo chown -R yourLocalUser .
```

Then deal with the 755 and 644 permissions as suggested during the installation.

# CDCI
## Suggested .gitignore
```ruby
# Suggested for better experience of CDCI

# Common trash
.idea/
.github/

.DS_Store

# Local installation cache and log, 
# safe enough for ignore for local dev.
data/cache/
data/logs/

# Production customizations, 
# safe enough for ignore for local dev.
data/upload/

# Files created during installation, 
# should be assued unchanged, using `git update-index --assume-unchanged <file>`
# ignored for now  
data/config-internal.php
data/config.php
install/config.php

```