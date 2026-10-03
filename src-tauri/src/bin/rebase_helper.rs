fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        // args[1] is mode (sequence | editor), args[2] is target file
        lode_lib::git::rebase::run_rebase_helper(&args[1..]);
    }
}
