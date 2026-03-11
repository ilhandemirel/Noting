module.exports = function (api) {
    api.cache(true);

    const isProjectFile = (filename) => {
        if (!filename) return true;
        return !filename.includes('node_modules');
    };

    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }]
        ],
        overrides: [
            {
                test: isProjectFile,
                plugins: [
                    ["@babel/plugin-proposal-decorators", { legacy: true }],
                    ["@babel/plugin-transform-class-properties", { loose: true }],
                ],
            },
        ],
        plugins: [
            "react-native-reanimated/plugin"
        ],
    };
};
