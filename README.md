# Best Chat Ever
It's, like, really good, oh my gosh.

## Setup:
### Install:
There are some dependencies that are necessary to install. There might be more. Let me know.
1. You need to have python2.7, mysql, and npm.
 On Linux:
 `sudo apt-get install build-essential python-dev libmysqlclient-dev python-mysqldb npm`
 On Mac:
 `brew install mysql npm openssl`
  Then follow the instructions here to get pip (brew will also give you this url if you type `brew install pip`):
 `https://pip.readthedocs.io/en/stable/installing/`
 
 On Windows:
  Just use PyCharm. It will work. 
  
2. `npm install -g less less-plugin-clean-css`
3. `pip3 install -r install/requirements.txt`

  If this doesn't work, try sudo. Some of the packages are dumb.
  
  If this doesn't work on Mac, try:
  
  `pip install --ignore-installed -r install/pip-install`

  You can also just use PyCharm and it will install them for you.
  
  On Windows:
    Don't use a venv, it gets weird with some of the dependencies. 
  
    MySQL-Python _will fail_, it doesn't really matter what you do.
    
    Download the installer here:  https://www.lfd.uci.edu/~gohlke/pythonlibs/#mysql-python

#### Database:
1. Setup a local MySql database.
2. Import `install/bestChat.sql` to get the schema and tables. (If you've already been working on it, this _will_ wipe your tables, fyi.)
3. Make a user 'bestChat' with the password in `chat.cfg` and (at least) the following
permissions to the `bestchat` schema: DELETE, EXECUTE, INSERT, SELECT, SHOW, VIEW, UPDATE


## To run:

### Places to edit:
1. Set the client to use your server url (`static/js/client/BestEvarChatClient.js` line `11`)

### Actually running:

1. `npm build`
3. `python tornado_chat.py`


---


cat images: http://www.iconka.com


twemoji client parsing: https://github.com/twitter/twemoji


joypixels emoji assets: https://www.joypixels.com/
