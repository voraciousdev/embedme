"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = require("fs");
const path_1 = require("path");
var SupportedFileType;
(function (SupportedFileType) {
    SupportedFileType["PLAIN_TEXT"] = "txt";
    SupportedFileType["TYPESCRIPT"] = "ts";
    SupportedFileType["JAVASCRIPT"] = "js";
    SupportedFileType["REASON"] = "re";
    SupportedFileType["SCSS"] = "scss";
    SupportedFileType["RUST"] = "rust";
    SupportedFileType["JAVA"] = "java";
    SupportedFileType["CPP"] = "cpp";
    SupportedFileType["C"] = "c";
    SupportedFileType["HTML"] = "html";
    SupportedFileType["XML"] = "xml";
    SupportedFileType["MARKDOWN"] = "md";
    SupportedFileType["YAML"] = "yaml";
    SupportedFileType["JSON"] = "json";
    SupportedFileType["JSON_5"] = "json5";
    SupportedFileType["PYTHON"] = "py";
    SupportedFileType["BASH"] = "bash";
    SupportedFileType["SHELL"] = "sh";
    SupportedFileType["GOLANG"] = "go";
    SupportedFileType["OBJECTIVE_C"] = "objectivec";
    SupportedFileType["PHP"] = "php";
    SupportedFileType["C_SHARP"] = "cs";
    SupportedFileType["SWIFT"] = "swift";
    SupportedFileType["RUBY"] = "rb";
    SupportedFileType["KOTLIN"] = "kotlin";
    SupportedFileType["SCALA"] = "scala";
    SupportedFileType["CRYSTAL"] = "cr";
    SupportedFileType["PLANT_UML"] = "puml";
    SupportedFileType["MERMAID"] = "mermaid";
    SupportedFileType["CMAKE"] = "cmake";
    SupportedFileType["PROTOBUF"] = "proto";
    SupportedFileType["SQL"] = "sql";
    SupportedFileType["HASKELL"] = "hs";
    SupportedFileType["ARDUINO"] = "ino";
    SupportedFileType["JSX"] = "jsx";
    SupportedFileType["TSX"] = "tsx";
})(SupportedFileType || (SupportedFileType = {}));
var CommentFamily;
(function (CommentFamily) {
    CommentFamily[CommentFamily["NONE"] = 0] = "NONE";
    CommentFamily[CommentFamily["C"] = 1] = "C";
    CommentFamily[CommentFamily["XML"] = 2] = "XML";
    CommentFamily[CommentFamily["HASH"] = 3] = "HASH";
    CommentFamily[CommentFamily["SINGLE_QUOTE"] = 4] = "SINGLE_QUOTE";
    CommentFamily[CommentFamily["DOUBLE_PERCENT"] = 5] = "DOUBLE_PERCENT";
    CommentFamily[CommentFamily["DOUBLE_HYPHENS"] = 6] = "DOUBLE_HYPHENS";
})(CommentFamily || (CommentFamily = {}));
const languageMap = {
    [CommentFamily.NONE]: [SupportedFileType.JSON],
    [CommentFamily.C]: [
        SupportedFileType.PLAIN_TEXT,
        SupportedFileType.C,
        SupportedFileType.TYPESCRIPT,
        SupportedFileType.REASON,
        SupportedFileType.JAVASCRIPT,
        SupportedFileType.RUST,
        SupportedFileType.CPP,
        SupportedFileType.JAVA,
        SupportedFileType.GOLANG,
        SupportedFileType.OBJECTIVE_C,
        SupportedFileType.SCSS,
        SupportedFileType.PHP,
        SupportedFileType.C_SHARP,
        SupportedFileType.SWIFT,
        SupportedFileType.KOTLIN,
        SupportedFileType.SCALA,
        SupportedFileType.JSON_5,
        SupportedFileType.PROTOBUF,
        SupportedFileType.ARDUINO,
        SupportedFileType.JSX,
        SupportedFileType.TSX,
    ],
    [CommentFamily.XML]: [SupportedFileType.HTML, SupportedFileType.MARKDOWN, SupportedFileType.XML],
    [CommentFamily.HASH]: [
        SupportedFileType.PYTHON,
        SupportedFileType.BASH,
        SupportedFileType.SHELL,
        SupportedFileType.YAML,
        SupportedFileType.RUBY,
        SupportedFileType.CRYSTAL,
        SupportedFileType.CMAKE,
    ],
    [CommentFamily.SINGLE_QUOTE]: [SupportedFileType.PLANT_UML],
    [CommentFamily.DOUBLE_PERCENT]: [SupportedFileType.MERMAID],
    [CommentFamily.DOUBLE_HYPHENS]: [SupportedFileType.SQL, SupportedFileType.HASKELL],
};
const leadingSymbol = (symbol) => line => {
    const regex = new RegExp(`${symbol}\\s?(\\S*?$)`);
    const match = line.match(regex);
    if (!match) {
        return null;
    }
    return match[1];
};
const filetypeCommentReaders = {
    [CommentFamily.NONE]: _ => null,
    [CommentFamily.C]: leadingSymbol('//'),
    [CommentFamily.XML]: line => {
        const match = line.match(/<!--\s*?(\S*?)\s*?-->/);
        if (!match) {
            return null;
        }
        return match[1];
    },
    [CommentFamily.HASH]: leadingSymbol('#'),
    [CommentFamily.SINGLE_QUOTE]: leadingSymbol(`'`),
    [CommentFamily.DOUBLE_PERCENT]: leadingSymbol('%%'),
    [CommentFamily.DOUBLE_HYPHENS]: leadingSymbol('--'),
};
function lookupLanguageCommentFamily(fileType) {
    return Object.values(CommentFamily)
        .filter(x => typeof x === 'number')
        .find((commentFamily) => languageMap[commentFamily].includes(fileType));
}
exports.logBuilder = (options, errorLog = false) => (logConstructor) => {
    if (!options.silent) {
        if (errorLog || options.stdout) {
            // as we're putting the resulting file out of stdout, we redirect the logs to stderr so they can still be seen,
            // but won't be piped
            console.error(logConstructor(chalk_1.default.stderr));
        }
        else {
            console.log(logConstructor(chalk_1.default));
        }
    }
};
/* @internal */
function getReplacement(inputFilePath, options, logMethod, substr, leadingSpaces, lineEnding, codeExtension, firstLine, startLineNumber, ignoreNext, commentEmbedOverrideFilepath) {
    /**
     * Re-declare the log class, prefixing each snippet with the file and line number
     * Note that we couldn't have derived the line count in the parent regex matcher, as we don't yet know how long the
     * embed is going to be.
     */
    const log = ({ returnSnippet }, logConstructor) => {
        const endLineNumber = returnSnippet.split(lineEnding).length + startLineNumber - 1;
        logMethod(chalk => {
            const logPrefix = chalk.gray(`   ${path_1.relative(process.cwd(), inputFilePath)}#L${startLineNumber}-L${endLineNumber}`);
            return logPrefix + ' ' + logConstructor(chalk);
        });
    };
    if (ignoreNext) {
        log({ returnSnippet: substr }, chalk => chalk.blue(`"Ignore next" comment detected, skipping code block...`));
        return substr;
    }
    let commentedFilename;
    if (commentEmbedOverrideFilepath) {
        commentedFilename = commentEmbedOverrideFilepath;
    }
    else {
        if (!codeExtension) {
            log({ returnSnippet: substr }, chalk => chalk.blue(`No code extension detected, skipping code block...`));
            return substr;
        }
        if (!firstLine) {
            log({ returnSnippet: substr }, chalk => chalk.blue(`Code block is empty & no preceding embedme comment, skipping...`));
            return substr;
        }
        const supportedFileTypes = Object.values(SupportedFileType).filter(x => typeof x === 'string');
        if (supportedFileTypes.indexOf(codeExtension) < 0) {
            log({ returnSnippet: substr }, chalk => chalk.yellow(`Unsupported file extension [${codeExtension}], supported extensions are ${supportedFileTypes.join(', ')}, skipping code block`));
            return substr;
        }
        const languageFamily = lookupLanguageCommentFamily(codeExtension);
        if (languageFamily == null) {
            log({ returnSnippet: substr }, chalk => chalk.red(`File extension ${chalk.underline(codeExtension)} marked as supported, but comment family could not be determined. Please report this issue.`));
            return substr;
        }
        commentedFilename = filetypeCommentReaders[languageFamily](firstLine);
    }
    if (!commentedFilename) {
        log({ returnSnippet: substr }, chalk => chalk.gray(`No comment detected in first line for block with extension ${codeExtension}`));
        return substr;
    }
    const matches = commentedFilename.match(/\s?(\S+?)((#L(\d+)-L(\d+))|$)/m);
    if (!matches) {
        log({ returnSnippet: substr }, chalk => chalk.gray(`No file found in embed line`));
        return substr;
    }
    const [, filename, , lineNumbering, startLine, endLine] = matches;
    if (filename.includes('#')) {
        log({ returnSnippet: substr }, chalk => chalk.red(`Incorrectly formatted line numbering string ${chalk.underline(filename)}, Expecting Github formatting e.g. #L10-L20`));
        return substr;
    }
    const relativePath = options.sourceRoot
        ? path_1.resolve(process.cwd(), options.sourceRoot, filename)
        : path_1.resolve(inputFilePath, '..', filename);
    if (!fs_1.existsSync(relativePath)) {
        log({ returnSnippet: substr }, chalk => chalk.red(`Found filename ${chalk.underline(filename)} in comment in first line, but file does not exist at ${chalk.underline(relativePath)}!`));
        return substr;
    }
    const file = fs_1.readFileSync(relativePath, 'utf8');
    let lines = file.split(lineEnding);
    if (lineNumbering) {
        lines = lines.slice(+startLine - 1, +endLine);
    }
    const minimumLeadingSpaces = lines.reduce((minSpaces, line) => {
        if (minSpaces === 0) {
            return 0;
        }
        if (line.length === 0) {
            return Infinity; //empty lines shouldn't count
        }
        const leadingSpaces = line.match(/^[\s]+/m);
        if (!leadingSpaces) {
            return 0;
        }
        return Math.min(minSpaces, leadingSpaces[0].length);
    }, Infinity);
    lines = lines.map(line => line.slice(minimumLeadingSpaces));
    const outputCode = lines.join(lineEnding).trim();
    if (/```/.test(outputCode)) {
        log({ returnSnippet: substr }, chalk => chalk.red(`Output snippet for file ${chalk.underline(filename)} contains a code fence. Refusing to embed as that would break the document`));
        return substr;
    }
    let replacement = !!commentEmbedOverrideFilepath || options.stripEmbedComment
        ? `\`\`\`${codeExtension}${lineEnding}${outputCode}${lineEnding}\`\`\``
        : `\`\`\`${codeExtension}${lineEnding}${firstLine.trim()}${lineEnding}${lineEnding}${outputCode}${lineEnding}\`\`\``;
    if (leadingSpaces.length) {
        replacement = replacement
            .split(lineEnding)
            .map(line => leadingSpaces + line)
            .join(lineEnding);
    }
    if (replacement === substr) {
        log({ returnSnippet: substr }, chalk => chalk.gray(`No changes required, already up to date`));
        return substr;
    }
    const chalkColour = options.verify ? 'yellow' : 'green';
    log({ returnSnippet: replacement }, chalk => chalk[chalkColour](`Embedded ${chalk[(chalkColour + 'Bright')](lines.length + ' lines')}${options.stripEmbedComment ? chalk.italic(' without comment line') : ''} from file ${chalk.underline(commentedFilename)}`));
    return replacement;
}
function getLineNumber(text, index, lineEnding) {
    return text.substring(0, index).split(lineEnding).length;
}
function detectLineEnding(sourceText) {
    let rexp = new RegExp(/\r\n/);
    return rexp.test(sourceText) ? '\r\n' : '\n';
}
function embedme(sourceText, inputFilePath, options) {
    const log = exports.logBuilder(options);
    log(chalk => chalk.magenta(`  Analysing ${chalk.underline(path_1.relative(process.cwd(), inputFilePath))}...`));
    /**
     * Match a codefence, capture groups around the file extension (optional) and first line starting with // (optional)
     */
    const codeFenceFinder = /([ \t]*?)```([\s\S]*?)^[ \t]*?```/gm;
    /*
     * Detects line ending to use based on whether or not CRLF is detected in the source text.
     */
    const lineEnding = detectLineEnding(sourceText);
    const docPartials = [];
    let previousEnd = 0;
    let result;
    while ((result = codeFenceFinder.exec(sourceText)) !== null) {
        const [codeFence, leadingSpaces] = result;
        const start = sourceText.substring(previousEnd, result.index);
        const extensionMatch = codeFence.match(/```(.*)/);
        const codeExtension = extensionMatch ? extensionMatch[1] : null;
        const splitFence = codeFence.split(lineEnding);
        const firstLine = splitFence.length >= 3 ? splitFence[1] : null;
        /**
         * Working out the starting line number is slightly complex as the logic differs depending on whether or not we are
         * writing to the file.
         */
        const startLineNumber = (() => {
            if (options.dryRun || options.stdout || options.verify) {
                return getLineNumber(sourceText.substring(0, result.index), result.index, lineEnding);
            }
            const startingLineNumber = docPartials.join('').split(lineEnding).length - 1;
            return (startingLineNumber + getLineNumber(sourceText.substring(previousEnd, result.index), result.index, lineEnding));
        })();
        const commentInsertion = start.match(/<!--\s*?embedme[ ]+?(\S+?)\s*?-->/);
        const replacement = getReplacement(inputFilePath, options, log, codeFence, leadingSpaces, lineEnding, codeExtension, firstLine || '', startLineNumber, /<!--\s*?embedme[ -]ignore-next\s*?-->/g.test(start), commentInsertion ? commentInsertion[1] : undefined);
        docPartials.push(start, replacement);
        previousEnd = codeFenceFinder.lastIndex;
    }
    return [...docPartials].join('') + sourceText.substring(previousEnd);
}
exports.embedme = embedme;
