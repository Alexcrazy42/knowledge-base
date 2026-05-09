# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build the entire solution
dotnet build Patterns.sln

# Build a specific project
dotnet build src/BehaviorPatterns/BehaviorPatterns.csproj

# Run a specific project (pattern group)
dotnet run --project src/GenerativePatterns
dotnet run --project src/StructuralPatterns
dotnet run --project src/BehaviorPatterns
dotnet run --project src/Dispatcing
dotnet run --project src/JsonConverterWithRecursiveComposition

# Run tests (if any test projects exist in the future)
dotnet test Patterns.sln
```

## Architecture

This is a C# (.NET 9) **educational reference solution** for GoF design patterns. There are no tests — the projects are console apps that demonstrate patterns by running examples.

### Solution structure

- `src/GenerativePatterns/` — Creational patterns (Abstract Factory, Builder, Factory Method, Prototype, Singleton)
- `src/StructuralPatterns/` — Structural patterns (Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy)
- `src/BehaviorPatterns/` — Behavioral patterns (Chain of Responsibility, Command, Interpreter, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor)
- `src/Dispatcing/` — Dispatching concepts (static vs dynamic dispatch, double dispatch via Visitor)
- `src/JsonConverterWithRecursiveComposition/` — Experiment: JSON serializer built using the Composite pattern
- `Chapters/` — Markdown documentation (in Russian) explaining patterns with theory and examples

### Per-project pattern

Each pattern group project (`GenerativePatterns`, `StructuralPatterns`, `BehaviorPatterns`) follows the same structure:
- `Program.cs` — entry point that calls one `CommonClient` method (uncomment others to run different patterns)
- `CommonClient.cs` — orchestrates all pattern demos via `UseXxx()` static methods
- One subdirectory per pattern, e.g. `BehaviorPatterns/Visitor/`, containing the pattern implementation

To run a different pattern demo, edit `Program.cs` and comment/uncomment the desired `CommonClient.UseXxx()` call.

### Project configuration

- `Directory.Build.props` — solution-wide MSBuild settings: `net9.0` target, `Nullable enable`, `TreatWarningsAsErrors true`, `ImplicitUsings enable`, Roslyn analyzers for all projects, xUnit + Moq + FluentAssertions for test projects (auto-detected by project name containing `Tests`)
- `Directory.Packages.props` — Central Package Management (CPM); all `PackageVersion` entries are here, `.csproj` files only reference package names without versions
- Assembly names follow `Self.Patterns.<ProjectName>` convention

### Chapters documentation

`Chapters/*.md` files are structured course chapters (in Russian) covering:
- `1.md`–`5.md` — main GoF pattern chapters
- `introduction.md` — pattern fundamentals
- `object_relationships.md` — inheritance, composition, delegation
- `other_patterns.md`, `other_useful_patterns.md` — architectural, multithreading, DDD, microservice patterns
- `ddd.md`, `dotnetlibs.md` — DDD concepts and .NET library recommendations


Be concise, no explanations unless asked
