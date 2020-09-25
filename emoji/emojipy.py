# -*- coding: utf-8; -*-

from __future__ import unicode_literals
import re

import struct
from itertools import islice

from tornado.escape import xhtml_unescape

from ruleset import unicode_replace, \
    shortcode_replace, ascii_replace

chr = unichr


class Emoji(object):
    ascii = False
    unicode_alt = True
    sprites = False
    ignored_regexp = '<(?:object|embed|svg|img|div|span|p|a)[^>]*>|<\/(?:object|embed|svg|img|div|span|p|a)>'
    unicode_regexp = "(" + '|'.join(
        [re.escape(x.decode("utf-8")) for x in sorted(unicode_replace.keys(), key=len, reverse=True)]) + ")"
    shortcode_regexp = ':([-+\\w]+):'
    ascii_regexp = r"(\A|(?<=\s))(" \
                   r"(?#1: Right-side up)((?#halos/eyebrows/sweat)[0O>']?(?#eyes)[:=;B*#8X%](?#tears)'?(?#noses)-?" \
                   r"(?#mouths)[\\/\(\)D*#$|\]\[@o0OXPpbSL])|" \
                   r"(?#2: Upside down)((?#mouths)[\(\[D](?#noses)[-]?(?#eyes)[:=])|" \
                   r"(?#3: Horizontal faces)((?#left eye)[oO>-](?#mouth)(.|_+)?(?#right eye)[oO<-])|" \
                   r"(?#hearts)(<[\\/]?3))(\Z|\s)"
    unicode_compiled = re.compile(ignored_regexp + "|(" + unicode_regexp + ")",
                                  re.UNICODE)
    shortcode_compiled = re.compile(ignored_regexp + "|(" + shortcode_regexp + ")",
                                    re.IGNORECASE)
    ascii_compiled = re.compile(ignored_regexp + "|(" + ascii_regexp + ")")

    @classmethod
    def shortcode_to_unicode(cls, text):
        def replace_shortcode(match):
            shortcode = text[match.start():match.end()]
            if not shortcode or shortcode not in shortcode_replace:
                return shortcode
            flipped_unicode_replace = {v: k for k, v in unicode_replace.items()}
            if shortcode in flipped_unicode_replace:
                return flipped_unicode_replace[shortcode].decode('utf8')
            return shortcode

        text = re.sub(cls.shortcode_compiled, replace_shortcode, text)
        if cls.ascii:
            return cls.ascii_to_unicode(text)
        return text

    @classmethod
    def ascii_to_unicode(cls, text):
        def replace_ascii(match):
            ascii = text[match.start():match.end()]
            ascii = ascii.encode('ascii', 'ignore').strip()  # convert escaped HTML entities back to original chars
            if not ascii or ascii not in ascii_replace:
                return ascii
            return cls.convert(ascii_replace[ascii])

        text = xhtml_unescape(text)
        return re.sub(cls.ascii_compiled, replace_ascii, text)

    @classmethod
    def convert(cls, hex_unicode):

        def char(i):
            try:
                return chr(i)
            except ValueError:
                return struct.pack('i', i).decode('utf-32')

        """
        Convert a unicode in hex string to actual unicode char
        """

        if '-' not in hex_unicode:
            return char(int(hex_unicode, 16))
        parts = hex_unicode.split('-')
        return ''.join(char(int(x, 16)) for x in parts)

    def search(self, query):
        return list(islice(
            [self.ascii_to_unicode(self.shortcode_to_unicode(item)) for item in dict(shortcode_replace, **ascii_replace)
             if query in item], 108))
