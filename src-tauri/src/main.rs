// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 && args[1] == "--rebase-helper" {
        lode_lib::git::rebase::run_rebase_helper(&args[2..]);
        return;
    }

    lode_lib::run();
}
