import re
from random import choice, randrange

class ProfamityFilter(object):
    fuck_finder = 'f+u[fuck]*[ck]+'
    profamity_regexes = []

    # motherfucker
    profamity_regexes.append({
        'regex': re.compile('m+o+t+h+e+r+[ -]?' + fuck_finder + 'e+r*', re.IGNORECASE),
        'replacements': ['motherfudger', 'mf-er', 'fire trucker', 'mofo', 'mother father', 'muhfugha', 'fothermucker']
    })
    # motherfucking
    profamity_regexes.append({
        'regex': re.compile('m+o+t+h+e+r+[ -]?' + fuck_finder + 'i+n+g*', re.IGNORECASE),
        'replacements': ['motherfudging', 'mf-ing', 'fire trucking', 'monkey fighting', 'fothermucking']
    })
    # fucking
    profamity_regexes.append({
        'regex': re.compile(fuck_finder + 'i+n+g*', re.IGNORECASE),
        'replacements': ['f-wording', 'frigging', 'fricking', 'flipping', 'farting', 'forking']
    })
    # fuck
    profamity_regexes.append({
        'regex': re.compile(fuck_finder, re.IGNORECASE),
        'replacements': ['duck', 'feck', 'f-word', 'fridge', 'frig', 'frick', 'fudge', 'flip', 'fart', 'fork', 'joder']
    })

    # cock/dick
    profamity_regexes.append({
        'regex': re.compile('(c+o+c?k+)|(d+i+c?k+)', re.IGNORECASE),
        'replacements': ['nether regions', 'rooster', 'peepee', 'peen', 'cork', 'member', 'stick', 'anaconda']
    })

    # shit
    profamity_regexes.append({
        'regex': re.compile('s+h+[iey]*i+t+e*', re.IGNORECASE),
        'replacements': ['crap', 'crud', 'shiznit', 'waesucks', 'suck', 'sugar', 's-word', 'shoot', 'snap', 'poop', 'snot', 'shirt', 'turd', 'merde', 'mierda', 'shucks']
    })

    # damnit
    profamity_regexes.append({
        'regex': re.compile('d+a+m+[mn]+[ ]?i+t+', re.IGNORECASE),
        'replacements': ['dagnabit', 'zooterkins', 'consarn it', 'woo lad']
    })

    # damn
    profamity_regexes.append({
        'regex': re.compile('d+a+m+n+', re.IGNORECASE),
        'replacements': ['d-word', 'darn', 'dang', 'doom']
    })

    #asshole
    profamity_regexes.append({
        'regex': re.compile('a+s+s?h+o+l+e?', re.IGNORECASE),
        'replacements': ['poophole', 'chilihole', 'butthole', 'bumhole', 'tushiehole']
    })

    #dumbass
    profamity_regexes.append({
        'regex': re.compile('d+u+m+b?a+s+s?', re.IGNORECASE),
        'replacements': ['dumdum', 'dummy', 'fopdoodle', 'stupidhead', 'dotard']
    })

    # ass
    profamity_regexes.append({
        'regex': re.compile('a+s+s+', re.IGNORECASE),
        'replacements': ['a-word', 'butt', 'bum', 'backside', 'behind', 'angus', 'pooper', 'buttocks', 'tushie', 'tushy', 'tush', 'bumbum']
    })

    # jesus christ
    profamity_regexes.append({
        'regex': re.compile('j+e+s+u+s+[ ]+c+h?r+i+s+t+', re.IGNORECASE),
        'replacements': ['cheese and rice', 'jeez', 'jeez louise', 'hail satan']
    })

    # bitch
    profamity_regexes.append({
        'regex': re.compile('b+i+t+c+h+', re.IGNORECASE),
        'replacements': ['beach', 'beech', 'b-word', 'witch', 'witch with a capital B', 'bisnitch', 'betch', 'batch', 'bench']
    })

    # god
    profamity_regexes.append({
        'regex': re.compile('g+o+d+', re.IGNORECASE),
        'replacements': ['zeus', 'ra', 'gosh', 'golly', 'mon dieu', 'heaven', 'goodness', 'dog', 'allah', 'jehovah', 'yahweh', "buddha"]
    })

    # whore
    profamity_regexes.append({
        'regex': re.compile('(w+h+o+r+e+)|(h+o+o+k+e+r+)|(s+l+u+t+)', re.IGNORECASE),
        'replacements': ['succubus', 'siren', 'enchantress', 'wench', 'lady of the night', 'prostitute', 'bucket', 'sloot', 'ho', 'hobag', 'harlot', 'trollop']
    })

    # cunt/twat
    profamity_regexes.append({
        'regex': re.compile('(c+u+n+t+)|(t+w+a+t+)'),
        'replacements': ['front butt', 'lady parts', 'girly bits', 'lady garden', 'nether regions', 'cooch', 'hooha', 'coochie', 'bajango', 'vajayjay', 'v', 'peach', 'beaver', 'coozie', 'muff', 'cooter', 'fud', 'purse', 'snatch']
    })

    def scan_for_fucks(self, text):
        for profamity in self.profamity_regexes:
            text = re.sub(profamity['regex'], choice(profamity['replacements']), text)
        return text
