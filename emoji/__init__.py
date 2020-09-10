# -*- coding: utf-8; -*-

import re

from emojipy import Emoji

class BestEverEmoji(Emoji):
    ascii_compiled = re.compile(Emoji.ignored_regexp + "|(" + r"(\A|(?<=\s))(" + Emoji.ascii_regexp + r")(\Z|\s)" + ")",
                                    re.IGNORECASE)