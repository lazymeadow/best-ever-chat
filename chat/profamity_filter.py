import re
from random import randrange


class ProfamityFilter(object):
    fuck_finder = 'f+u[fuck]+[ck]+'
    motherfucker_regex = re.compile('\bm+o+t+h+e+r+[ -]?' + fuck_finder + 'e+r*', re.IGNORECASE)
    motherfucker_replacements = ['mf-er', 'fire trucker', 'mofo']
    motherfucking_regex = re.compile('\bm+o+t+h+e+r+[ -]?' + fuck_finder + 'i+n+g*', re.IGNORECASE)
    motherfucking_replacements = ['mf-ing', 'fire trucking']
    fucking_regex = re.compile('\b' + fuck_finder + 'i+n+g*\b', re.IGNORECASE)
    fucking_replacements = ['f-wording', 'frigging', 'fricking', 'flipping', 'farting', 'forking']
    fuck_regex = re.compile('\b' + fuck_finder + '\b', re.IGNORECASE)
    fuck_replacements = ['f-word', 'fridge', 'frig', 'frick', 'fudge', 'flip', 'fart', 'fork', 'joder']

    cock_regex = ''
    cock_replacements = []

    piss_regex = ''
    piss_replacements = []

    tits_regex = ''
    tits_replacements = []

    twat_regex = ''
    twat_replacements = []

    shit_regex = re.compile('s+h+[iey]*i+t+e*', re.IGNORECASE)
    shit_replacements = ['s-word', 'shoot', 'snap', 'poop', 'snot', 'shirt', 'turd', 'merde', 'mierda']

    ass_regex = re.compile('a+s+s+', re.IGNORECASE)
    ass_replacements = ['a-word', 'butt', 'bum', 'backside', 'behind']

    bitch_regex = re.compile('b+i+t+c+h+', re.IGNORECASE)
    bitch_replacements = ['b-word', 'witch']

    damn_regex = re.compile('d+a+m+n+', re.IGNORECASE)
    damn_replacements = ['d-word', 'darn', 'dang', 'dagnabit', '']

    god_regex = re.compile('g+o+d+', re.IGNORECASE)
    god_replacements = ['gosh', 'golly', 'mon dieu']

    whore_regex = re.compile('(w+h+o+r+e+)|(h+o+o+k+e+r+)', re.IGNORECASE)
    whore_replacements = ['lady of the night', 'prostitute', 'ho', 'hobag', 'harlot', 'trollop']

    cunt_regex = re.compile('c+u+n+t+')
    cunt_replacements = []

    def scan_for_fucks(self, text):
        return re.sub(self.fuck_regex, self.fuck_replacements[randrange(len(self.fuck_replacements))], text)