import {
    existsSync,
    readFileSync,
    readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(
    fileURLToPath(import.meta.url)
);
const DEFAULT_DOCS_DIRECTORY = path.resolve(
    currentDirectory,
    '../../../../docs/business-analysis'
);
const EXCLUDED_DIRECTORIES = new Set([
    '09-alignment',
    'assets',
]);
const STOP_WORDS = new Set([
    'va', 'la', 'cua', 'cho', 'mot', 'cac',
    'duoc', 'trong', 'khi', 'theo', 'voi',
    'nhung', 'nay', 'do', 'tu', 'den',
]);

const tokenize = (value) =>
    String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .match(/[a-z0-9_]{2,}/g)
        ?.filter((token) => !STOP_WORDS.has(token)) ?? [];

const listMarkdownFiles = (directory) => {
    if (!existsSync(directory)) return [];

    return readdirSync(directory, {
        withFileTypes: true,
    }).flatMap((entry) => {
        if (
            entry.isDirectory() &&
            EXCLUDED_DIRECTORIES.has(entry.name)
        ) return [];

        const target = path.join(
            directory,
            entry.name
        );
        if (entry.isDirectory()) {
            return listMarkdownFiles(target);
        }
        return entry.isFile() &&
            entry.name.endsWith('.md')
            ? [target]
            : [];
    });
};

const splitLongText = (text, maxCharacters) => {
    const paragraphs = text
        .split(/\n\s*\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    const chunks = [];
    let current = '';

    for (const paragraph of paragraphs) {
        if (
            current &&
            current.length + paragraph.length + 2 >
                maxCharacters
        ) {
            chunks.push(current);
            current = '';
        }
        current = current
            ? current + '\n\n' + paragraph
            : paragraph;
    }
    if (current) chunks.push(current);
    return chunks;
};

const chunkMarkdown = (
    content,
    source,
    maxCharacters = 1600
) => {
    const sections = [];
    let heading = 'Document';
    let body = [];

    const flush = () => {
        const text = body.join('\n').trim();
        if (text) sections.push({ heading, text });
        body = [];
    };

    for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^#{1,4}\s+(.+)$/);
        if (match) {
            flush();
            heading = match[1].trim();
        } else {
            body.push(line);
        }
    }
    flush();

    return sections.flatMap((section, sectionIndex) =>
        splitLongText(
            section.text,
            maxCharacters
        ).map((text, partIndex) => ({
            id: source + ':' + sectionIndex + ':' + partIndex,
            source,
            heading: section.heading,
            text,
            tokens: tokenize(
                section.heading + ' ' + text
            ),
        }))
    );
};

const loadMarkdownChunks = ({
    docsDirectory = DEFAULT_DOCS_DIRECTORY,
    maxCharacters = 1600,
} = {}) =>
    listMarkdownFiles(docsDirectory).flatMap((file) =>
        chunkMarkdown(
            readFileSync(file, 'utf8'),
            path
                .relative(docsDirectory, file)
                .replaceAll('\\', '/'),
            maxCharacters
        )
    );

const createLocalRagRetriever = (options = {}) => {
    let chunks = null;

    const ensureIndex = () => {
        if (!chunks) {
            chunks = loadMarkdownChunks(options);
        }
        return chunks;
    };

    const search = (query, limit = 5) => {
        const documents = ensureIndex();
        const queryTokens = [...new Set(
            tokenize(query)
        )];
        if (!queryTokens.length || !documents.length) {
            return [];
        }

        const averageLength =
            documents.reduce(
                (sum, item) =>
                    sum + item.tokens.length,
                0
            ) / documents.length || 1;
        const documentFrequency = new Map();

        for (const token of queryTokens) {
            documentFrequency.set(
                token,
                documents.filter((item) =>
                    item.tokens.includes(token)
                ).length
            );
        }

        return documents
            .map((item) => {
                const frequencies = new Map();
                for (const token of item.tokens) {
                    frequencies.set(
                        token,
                        (frequencies.get(token) ?? 0) + 1
                    );
                }

                let score = 0;
                for (const token of queryTokens) {
                    const frequency =
                        frequencies.get(token) ?? 0;
                    if (!frequency) continue;
                    const count =
                        documentFrequency.get(token) ?? 0;
                    const idf = Math.log(
                        1 +
                        (documents.length - count + 0.5) /
                        (count + 0.5)
                    );
                    const denominator = frequency + 1.5 * (
                        1 - 0.75 +
                        0.75 *
                        item.tokens.length /
                        averageLength
                    );
                    score += idf *
                        frequency * 2.5 /
                        denominator;
                }

                const headingTokens = tokenize(
                    item.heading
                );
                score += queryTokens.filter((token) =>
                    headingTokens.includes(token)
                ).length * 0.75;
                return { ...item, score };
            })
            .filter((item) => item.score > 0)
            .sort((left, right) =>
                right.score - left.score
            )
            .slice(0, limit)
            .map(({
                tokens: _tokens,
                ...item
            }) => item);
    };

    const buildContext = (query, limit = 5) => {
        const results = search(query, limit);
        return {
            results,
            context: results
                .map((item) =>
                    '[' + item.source +
                    ' # ' + item.heading + ']\n' +
                    item.text
                )
                .join('\n\n---\n\n'),
        };
    };

    return {
        buildContext,
        search,
    };
};

export {
    DEFAULT_DOCS_DIRECTORY,
    chunkMarkdown,
    createLocalRagRetriever,
    loadMarkdownChunks,
    tokenize,
};
