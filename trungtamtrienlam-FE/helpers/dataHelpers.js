class DataHelpers {
    static async copyClipboard(value) {
        await navigator.clipboard.writeText(value);
    }

    static async pasteClipboard() {
        const value = await navigator.clipboard.readText();

        return value;
    }
}

export default DataHelpers;