# Clean Code Standards (ryanmcdermott/clean-code-javascript)
# Nạp vào MentorAgent Shadow Review prompt để chấm code theo chuẩn công nghiệp

## Variables
- Use meaningful and pronounceable variable names
- Use the same vocabulary for the same type of variable
- Use searchable names
- Use explanatory variables
- Avoid mental mapping
- Don't add unneeded context
- Use default arguments instead of short circuiting or conditionals

## Functions
- Function arguments: 2 or fewer ideally
- Functions should do one thing
- Functions should only be one level of abstraction
- Remove duplicate code
- Don't use flags as function parameters
- Avoid side effects
- Don't write to global functions
- Favor functional programming over imperative programming
- Encapsulate conditionals
- Avoid negative conditionals
- Avoid conditionals (use polymorphism)
- Avoid type-checking
- Remove dead code

## Objects and Data Structures
- Use getters and setters
- Make objects have private members
- Prefer composition over inheritance

## Classes
- Prefer ES2015/ES2016 classes over ES5 plain functions
- Use method chaining
- Prefer composition over inheritance (again, it's very important)

## SOLID
- Single Responsibility Principle (SRP)
- Open/Closed Principle (OCP)
- Liskov Substitution Principle (LSP)
- Interface Segregation Principle (ISP)
- Dependency Inversion Principle (DIP)

## Testing
- Single concept per test
- Use descriptive test names

## Concurrency
- Use Promises, not callbacks
- Async/Await is even cleaner than Promises

## Error Handling
- Don't ignore caught errors
- Don't ignore rejected promises

## Formatting
- Use consistent capitalization
- Functions callers and callees should be close
- Organize methods so that each is just below the next

## Comments
- Only comment things that have business logic complexity
- Don't leave commented out code in your codebase
- Don't have journal comments
- Avoid positional markers
