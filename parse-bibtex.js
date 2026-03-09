/**
 * BibtexParser - A modern JavaScript BibTeX parser
 * Original work by Henrik Muehe (c) 2010
 * CommonJS port by Mikola Lysenko 2013
 */

class BibtexParser {
    constructor() {
        this.pos = 0;
        this.input = "";
        this.entries = {};
        this.strings = {
            JAN: "January",
            FEB: "February",
            MAR: "March",
            APR: "April",
            MAY: "May",
            JUN: "June",
            JUL: "July",
            AUG: "August",
            SEP: "September",
            OCT: "October",
            NOV: "November",
            DEC: "December"
        };
        this.currentKey = "";
        this.currentEntry = "";
    }

    setInput(t) {
        this.input = t;
        this.pos = 0;
    }

    getEntries() {
        return this.entries;
    }

    isWhitespace(s) {
        return (s === ' ' || s === '\r' || s === '\t' || s === '\n');
    }

    match(s) {
        this.skipWhitespace();
        if (this.input.substring(this.pos, this.pos + s.length) === s) {
            this.pos += s.length;
        } else {
            throw new Error(`Token mismatch, expected ${s}, found ${this.input.substring(this.pos, this.pos + 20)}...`);
        }
        this.skipWhitespace();
    }

    tryMatch(s) {
        this.skipWhitespace();
        return this.input.substring(this.pos, this.pos + s.length) === s;
    }

    skipWhitespace() {
        while (this.pos < this.input.length && this.isWhitespace(this.input[this.pos])) {
            this.pos++;
        }
        if (this.input[this.pos] === "%") {
            while (this.pos < this.input.length && this.input[this.pos] !== "\n") {
                this.pos++;
            }
            this.skipWhitespace();
        }
    }

    value_braces() {
        let bracecount = 0;
        this.match("{");
        let start = this.pos;
        while (true) {
            if (this.input[this.pos] === '}' && this.input[this.pos - 1] !== '\\') {
                if (bracecount > 0) {
                    bracecount--;
                } else {
                    let end = this.pos;
                    this.match("}");
                    return this.input.substring(start, end);
                }
            } else if (this.input[this.pos] === '{') {
                bracecount++;
            } else if (this.pos >= this.input.length - 1) {
                throw new Error("Unterminated value");
            }
            this.pos++;
        }
    }

    value_quotes() {
        this.match('"');
        let start = this.pos;
        while (true) {
            if (this.input[this.pos] === '"' && this.input[this.pos - 1] !== '\\') {
                let end = this.pos;
                this.match('"');
                return this.input.substring(start, end);
            } else if (this.pos >= this.input.length - 1) {
                throw new Error(`Unterminated value: ${this.input.substring(start, start + 20)}...`);
            }
            this.pos++;
        }
    }

    single_value() {
        let start = this.pos;
        if (this.tryMatch("{")) {
            return this.value_braces();
        } else if (this.tryMatch('"')) {
            return this.value_quotes();
        } else {
            let k = this.key();
            if (this.strings[k.toUpperCase()]) {
                return this.strings[k.toUpperCase()];
            } else if (k.match("^[0-9]+$")) {
                return k;
            } else {
                // If it's not a known string or number, maybe it's a literal or undefined string
                return k; 
            }
        }
    }

    value() {
        let values = [];
        values.push(this.single_value());
        while (this.tryMatch("#")) {
            this.match("#");
            values.push(this.single_value());
        }
        return values.join("");
    }

    key() {
        let start = this.pos;
        while (true) {
            if (this.pos >= this.input.length) {
                throw new Error("Runaway key");
            }

            if (this.input[this.pos].match(/[a-zA-Z0-9_:\.\/-]/)) {
                this.pos++;
            } else {
                return this.input.substring(start, this.pos);
            }
        }
    }

    key_equals_value() {
        let key = this.key();
        if (this.tryMatch("=")) {
            this.match("=");
            let val = this.value();
            return [key.toUpperCase(), val];
        } else {
            throw new Error(`... = value expected, equals sign missing: ${this.input.substring(this.pos, this.pos + 20)}...`);
        }
    }

    key_value_list() {
        let kv = this.key_equals_value();
        this.entries[this.currentEntry][kv[0]] = kv[1];
        while (this.tryMatch(",")) {
            this.match(",");
            if (this.tryMatch("}")) {
                break;
            }
            kv = this.key_equals_value();
            this.entries[this.currentEntry][kv[0]] = kv[1];
        }
    }

    entry_body(d) {
        this.currentEntry = this.key();
        this.entries[this.currentEntry] = { entryType: d.substring(1) };
        this.match(",");
        this.key_value_list();
    }

    directive() {
        this.match("@");
        return "@" + this.key();
    }

    string() {
        let kv = this.key_equals_value();
        this.strings[kv[0].toUpperCase()] = kv[1];
    }

    preamble() {
        this.value();
    }

    comment() {
        this.value(); 
    }

    entry(d) {
        this.entry_body(d);
    }

    bibtex() {
        while (this.pos < this.input.length) {
            this.skipWhitespace();
            if (this.pos >= this.input.length) break;
            
            if (this.tryMatch("@")) {
                let d = this.directive().toUpperCase();
                this.match("{");
                if (d === "@STRING") {
                    this.string();
                } else if (d === "@PREAMBLE") {
                    this.preamble();
                } else if (d === "@COMMENT") {
                    this.comment();
                } else {
                    this.entry(d);
                }
                this.match("}");
            } else {
                // Skip non-entry content
                this.pos++;
            }
        }
    }
}
