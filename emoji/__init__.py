# -*- coding: utf-8; -*-

import re
from itertools import islice

from emojipy import Emoji, ruleset

class BestEverEmoji(Emoji):
    ascii_compiled = re.compile(Emoji.ignored_regexp + "|(" + r"(\A|(?<=\s))(" + Emoji.ascii_regexp + r")(\Z|\s)" + ")",
                                    re.IGNORECASE)

    def search(self, query):
        return list(islice([self.ascii_to_unicode(self.shortcode_to_unicode(item)) for item in dict(ruleset.shortcode_replace, **ruleset.ascii_replace) if query in item], 108))