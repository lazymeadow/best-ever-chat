# Best Chat Ever
It's, like, really good, oh my gosh.

Now with Python 3!

## Setup:
### Install:
There are some dependencies that are necessary to install. There might be more. Let me know.
1. You need to have python3 (and pip3), mysql, and npm.

 On Linux:
 `sudo apt-get install build-essential libmysqlclient-dev npm`
 
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

#### Database:
1. Setup a local MySql database.
2. Import `install/bestChat.sql` to get the schema and tables. (If you've already been working on it, this _will_ wipe your tables, fyi.)
3. Make a user 'bestChat' with the password in `chat.cfg` and (at least) the following
permissions to the `bestchat` schema: DELETE, EXECUTE, INSERT, SELECT, SHOW, VIEW, UPDATE


#### SSL:
Things get weird if you don't have your connections upgrade. I do this with nginx (http://nginx.org/).

`install/sample_nginx.conf` is an example of how I set up my proxy conf. You can the two self-signed `.pem` files with this conf.

On lines `35` and `41`, change `server_name` from `local.chat` to your url.

For local dev, also add an entry to your host file, e.g.:
`127.0.0.1		local.chat`

NOTE: this sample conf is from _Windows_. You might need to edit it a little for mac/linux versions of nginx. 

You

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
