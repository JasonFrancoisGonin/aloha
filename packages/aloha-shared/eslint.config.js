import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist-module/**", "dist/**", "eslint.config.js"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      complexity: ["warn", { max: 20, variant: "modified" }],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }
);
