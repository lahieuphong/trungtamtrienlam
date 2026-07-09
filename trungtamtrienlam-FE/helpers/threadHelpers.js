
class ThreadHelpers {
    static sleep(millisecond) {
        return new Promise(resolve => setTimeout(resolve, millisecond));
    }
}

export default ThreadHelpers;