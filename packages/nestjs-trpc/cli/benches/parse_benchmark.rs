#![allow(clippy::unwrap_used, clippy::expect_used)]

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use nestjs_trpc::{parse_typescript_file, FileScanner, TsParser};
use std::path::PathBuf;

fn bench_fixtures_directory() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("benches/fixtures")
}

fn test_fixtures_directory() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

fn bench_parse_single_router(criterion: &mut Criterion) {
    let fixture = test_fixtures_directory().join("valid/simple-router/user.router.ts");

    criterion.bench_function("parse_single_router", |bencher| {
        bencher.iter(|| parse_typescript_file(black_box(&fixture)));
    });
}

fn parse_all_files(parser: &TsParser, files: &[PathBuf]) {
    for file in files {
        let _ = parser.parse_file(black_box(file));
    }
}

fn bench_parse_multiple_routers(criterion: &mut Criterion) {
    let routers_directory = bench_fixtures_directory().join("large-project/routers");

    let scanner = FileScanner::new(&routers_directory).expect("Scanner initialization failed");
    let router_files = scanner.scan("*.router.ts").expect("Scan failed");

    let files_10: Vec<_> = router_files.iter().take(10).cloned().collect();
    let files_25: Vec<_> = router_files.iter().take(25).cloned().collect();
    let files_50: Vec<_> = router_files.iter().take(50).cloned().collect();

    let mut group = criterion.benchmark_group("parse_multiple_routers");

    group.bench_function("10", |bencher| {
        let parser = TsParser::new();
        bencher.iter(|| parse_all_files(&parser, &files_10));
    });

    group.bench_function("25", |bencher| {
        let parser = TsParser::new();
        bencher.iter(|| parse_all_files(&parser, &files_25));
    });

    group.bench_function("50", |bencher| {
        let parser = TsParser::new();
        bencher.iter(|| parse_all_files(&parser, &files_50));
    });

    group.finish();
}

fn bench_parser_initialization(criterion: &mut Criterion) {
    criterion.bench_function("parser_initialization", |bencher| {
        bencher.iter(|| black_box(TsParser::new()));
    });
}

fn bench_file_scanning(criterion: &mut Criterion) {
    let routers_directory = bench_fixtures_directory().join("large-project/routers");

    criterion.bench_function("file_scanning_50_files", |bencher| {
        bencher.iter(|| {
            let scanner = FileScanner::new(black_box(&routers_directory)).unwrap();
            scanner.scan("*.router.ts")
        });
    });
}

criterion_group!(
    benches,
    bench_parse_single_router,
    bench_parse_multiple_routers,
    bench_parser_initialization,
    bench_file_scanning,
);

criterion_main!(benches);
