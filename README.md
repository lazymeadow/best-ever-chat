# Best Chat Ever
It's, like, really good, oh my gosh.

## Setup:
### Install:
There are some dependencies that are necessary to install. There might be more. Let me know.
1. You need to have python, mysql, and npm.
 On Linux:
 `sudo apt-get install build-essential python-dev libmysqlclient-dev python-mysqldb npm`
 On Mac:
 `brew install mysql npm openssl`
  Then follow the instructions here to get pip (brew will also give you this url if you type `brew install pip`):
 `https://pip.readthedocs.io/en/stable/installing/`
2. `npm install -g less less-plugin-clean-css`
3. `pip install -r install/pip-install`
  If this doesn't work, try sudo. Some of the packages are dumb.
  If this doesn't work on Mac, try:
  `pip install --ignore-installed -r install/pip-install`

#### Database:
1. Setup a local MySql database.
2. Import `install/bestChat.sql` to get the schema and tables.
3. Make a user 'bestChat' with the password in `tornado_chat.py` and (at least) the following
permissions to the `bestchat` schema: DELETE, EXECUTE, INSERT, SELECT, SHOW, VIEW, UPDATE


## To run:
1. `lessc ./static/less/chat.less ./static/chat.css --clean-css="--s1 --advanced --compatibility=ie8"`
2.`babel static\js\new_client --source-maps inline` -- this needs verified. also for a jetbrains filewatcher do `static\js\new_client --source-maps inline` with output a file from std out 
3. `python tornado_chat.py`


---


favicon from: http://www.iconka.com


twemoji: https://github.com/twitter/twemoji


emojione: https://www.emojione.com
