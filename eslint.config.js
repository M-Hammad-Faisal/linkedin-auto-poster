import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
    {
        ignores: [
            "dist/",
            "node_modules/",
            "eslint.config.js",
            "*.js",
            "*.cjs",
        ],
    },
    {
        files: ["src/**/*.ts"],
        extends: [
            ...tseslint.configs.recommendedTypeChecked,
            prettier,
        ],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                ...globals.node,
                ...globals.es2022,
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            import: importPlugin,
        },
        rules: {
            "no-console": ["warn", {allow: ["log", "warn", "error"]}],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "import/no-unresolved": "off",
        },
    }
);