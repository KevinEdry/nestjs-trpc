## Code Quality Standards

### Comments: Only "Why", Never "How" or "What"

**Golden Rule**: Code should be self-documenting. Comments explain *why*, never *what* or *how*.

```rust
// ❌ BAD: "What" comment - code already says this
// Increment the counter
counter += 1;

// ❌ BAD: "How" comment - code already shows how
// Loop through items and find matching ID
for item in items {
    if item.id == target_id {
        return Some(item);
    }
}

// ✅ GOOD: "Why" comment - explains business logic
// Task must move to previous column before deletion to maintain audit trail
move_task_previous();
delete_task();
```

**If you need a "how" or "what" comment, REFACTOR instead:**

```rust
// ❌ BAD: Needs comment to explain
// Parse the timestamp and convert to local timezone
let dt = chrono::DateTime::parse_from_rfc3339(&s)
    .map(|d| d.with_timezone(&chrono::Local))?;

// ✅ GOOD: Function name makes it clear
let dt = parse_timestamp_as_local(&s)?;
```

**When "why" comments are appropriate:**
- Business logic rationale: "We use base64 to avoid URL encoding issues"
- Performance trade-offs: "Caching here reduces API calls by 90%"
- Non-obvious algorithms: "Binary search chosen for O(log n) lookup on sorted data"
- Workarounds: "Clippy false positive on this pattern, see issue #123"
- Safety invariants: "SAFETY: This assumes the buffer is always initialized"

### No Abbreviations

**All identifiers must use full words, not abbreviations.**

```rust
// ❌ BAD: Abbreviations
let cfg = Config::default();
let msg = "Hello";
let idx = 0;
let btn = Button::new();
let ctx = AppContext::new();

// ✅ GOOD: Full words
let config = Config::default();
let message = "Hello";
let index = 0;
let button = Button::new();
let context = AppContext::new();
```

**Exceptions (industry standard abbreviations only):**
- `id` (identifier) - universally understood
- `url` (Uniform Resource Locator) - more common than "address"
- `html`, `json`, `xml` - file format names
- `io` (input/output) - standard library convention
- `uuid` (Universally Unique Identifier) - standard acronym
- `pty` (pseudo-terminal) - standard Unix term
- `terminal` (when referring to terminal emulator/UI) - standard term

**Common violations to avoid:**
- ❌ `num` → ✅ `number` or `count`
- ❌ `str` → ✅ `string` (except `&str` type)
- ❌ `arr` → ✅ `array`
- ❌ `btn` → ✅ `button`
- ❌ `msg` → ✅ `message`
- ❌ `tmp` → ✅ `temporary`
- ❌ `val` → ✅ `value`
- ❌ `cfg` → ✅ `config`
- ❌ `ctx` → ✅ `context`
- ❌ `doc` → ✅ `document`
- ❌ `img` → ✅ `image`

**Why this matters:**
- Code is read 10x more than written
- Abbreviations are ambiguous (`msg` = message or messages?)
- IDEs have autocomplete - no typing savings
- Newcomers understand full words instantly
- Consistency > brevity

**Refactoring over Comments:**
If you're writing a comment to explain what code does, the code is too complex. Refactor by:
1. Extract to well-named functions
2. Use descriptive variable names
3. Simplify complex expressions
4. Break long functions into smaller pieces

### Never Nester: Return Early

**CRITICAL RULE: Maximum nesting depth is 2 levels. NO EXCEPTIONS.**

Nested ifs are unreadable. Use early returns and descriptive variable names:

```rust
// ❌ BAD: Nested ifs to oblivion - WHO CAN READ THIS?
if self.selected_column == 1 {
    if let Some(task_idx) = self.selected_task {
        if let Some(task) = self.columns[self.selected_column].tasks.get_mut(task_idx) {
            if let Some(instance_id) = task.instance_id {
                task.is_paused = !task.is_paused;
                return Some((instance_id, task.is_paused));
            }
        }
    }
}
None

// ✅ GOOD: Early returns with descriptive checks
let is_in_progress_column = self.selected_column == 1;
if !is_in_progress_column {
    return None;
}

let task_index = self.selected_task?;
let task = self.columns[self.selected_column].tasks.get_mut(task_index)?;
let instance_id = task.instance_id?;

task.is_paused = !task.is_paused;
Some((instance_id, task.is_paused))
```

**Key techniques:**
1. **Use descriptive variable names for conditions** - `is_in_progress_column` instead of `self.selected_column == 1`
2. **Early return/guard clauses** - Check failure conditions first and return
3. **Use `?` operator** - Convert `Option`/`Result` to early returns automatically
4. **Invert conditions** - `if !condition { return }` keeps happy path unindented

```rust
// ❌ BAD: Triple nested
if user.is_admin {
    if project.is_active {
        if has_permission {
            do_work();
        }
    }
}

// ✅ GOOD: Flat with descriptive checks
let is_admin = user.is_admin;
let is_active = project.is_active;

if !is_admin || !is_active || !has_permission {
    return;
}

do_work();
```

### Functional Core, Imperative Shell

Separate pure logic from side effects:

```rust
// FUNCTIONAL CORE: Pure business logic
fn calculate_discount(user: &User, amount: f64) -> f64 {
    // Pure function - no I/O, no mutation
    if user.is_premium && amount > 100.0 {
        amount * 0.2
    } else {
        0.0
    }
}

// IMPERATIVE SHELL: Side effects at edges
fn apply_discount_and_save(user_id: Uuid, amount: f64) -> Result<()> {
    let user = database.load(user_id)?;          // I/O
    let discount = calculate_discount(&user, amount); // Pure
    database.save_transaction(discount)?;         // I/O
    Ok(())
}
```

**Benefits:**
- Pure functions are easy to test (no mocks)
- Logic is reusable across different contexts
- Side effects are isolated and explicit
- Easier to reason about code behavior

**Functional Core Rules:**
- ✅ Take data as parameters
- ✅ Return computed results
- ✅ No I/O (files, network, database)
- ✅ No mutation of external state
- ✅ No `Utc::now()` or random numbers (pass as parameter)
- ✅ Deterministic: same input → same output

**Imperative Shell Rules:**
- ✅ Handle I/O operations
- ✅ Manage state changes
- ✅ Call pure functions
- ✅ Keep thin - delegate logic to core
- ✅ Coordinate side effects

### Code Locality: Keep Things Together

**CRITICAL PRINCIPLE: Code should live close to where it's used.**

Don't create centralized files for things that aren't truly shared. This applies to:
- Constants
- Helper functions
- Type definitions
- Configuration

```rust
// ❌ BAD: Centralized constants file for unshared values
// src/constants.rs
pub const DIALOG_WIDTH: u16 = 60;
pub const COLUMN_HEIGHT: u16 = 7;
pub const BUTTON_COUNT: usize = 4;

// src/dialogs.rs
use crate::constants::DIALOG_WIDTH;  // Has to jump to another file

// src/columns.rs
use crate::constants::COLUMN_HEIGHT; // Has to jump to another file

// ✅ GOOD: Constants live with the code that uses them
// src/dialogs.rs
const DIALOG_WIDTH: u16 = 60;
const BUTTON_COUNT: usize = 4;

fn render_dialog() {
    // Constants are right here!
}

// src/columns.rs
const COLUMN_HEIGHT: u16 = 7;

fn render_column() {
    // Constants are right here!
}
```

**When to centralize:**
Only create a shared module when code is **actually used in 2+ places**:

```rust
// ✅ GOOD: Truly shared constants
// src/ui/colors.rs
pub const PRIMARY_COLOR: Color = Color::Cyan;
pub const ERROR_COLOR: Color = Color::Red;

// Used in multiple modules
// src/dialogs.rs
use crate::ui::colors::{PRIMARY_COLOR, ERROR_COLOR};

// src/status_bar.rs
use crate::ui::colors::{PRIMARY_COLOR, ERROR_COLOR};
```

**Benefits:**
- **Easier to understand** - No jumping between files to find definitions
- **Easier to modify** - Change constants without hunting through centralized files
- **Better encapsulation** - Each module owns its configuration
- **No false abstraction** - No "shared" files that aren't actually shared

**File Size Guideline:**
Keep files under 250-300 lines. If a file grows too large:
1. Split by **feature/responsibility**, not by "type of thing"
2. Keep related code together in the split modules

```
❌ BAD split:
ui/
  constants.rs      (all constants)
  helpers.rs        (all helpers)
  types.rs          (all types)

✅ GOOD split:
ui/
  dialogs.rs        (dialog constants, helpers, types, rendering)
  columns.rs        (column constants, helpers, types, rendering)
  status_bar.rs     (status constants, helpers, types, rendering)
```

### No Magic Numbers

**All numeric literals must be named constants with descriptive names.**

Magic numbers are unnamed numeric literals scattered through code. They make code hard to understand and maintain.

```rust
// ❌ BAD: What do these numbers mean?
if area.width < 80 {
    let size = 60;
} else {
    let size = 50;
}
let padding = 2;
let offset = padding * 2;

// ✅ GOOD: Self-documenting named constants
const SMALL_SCREEN_THRESHOLD: u16 = 80;
const DIALOG_WIDTH_SMALL: u16 = 60;
const DIALOG_WIDTH_NORMAL: u16 = 50;
const DIALOG_PADDING: u16 = 2;
const DIALOG_PADDING_DOUBLE: u16 = 4;

if area.width < SMALL_SCREEN_THRESHOLD {
    let size = DIALOG_WIDTH_SMALL;
} else {
    let size = DIALOG_WIDTH_NORMAL;
}
let padding = DIALOG_PADDING;
let offset = DIALOG_PADDING_DOUBLE;
```

**Exceptions (literals that are OK):**
- `0` and `1` in common contexts (array indexing, initialization, increment/decrement)
- `-1` for error codes or "not found" sentinels (when idiomatic)
- `2` in `x / 2` for simple halving
- Simple calculations: `100 - percent` for percentage complement

**When naming constants:**
- Use descriptive names that explain **what** the value represents
- Use units in the name: `TIMEOUT_MS`, `WIDTH_PIXELS`, `MAX_COUNT`
- Group related constants together

```rust
// ✅ GOOD: Clear naming with units and grouping
// Dialog dimensions
const DIALOG_WIDTH_THRESHOLD: u16 = 80;
const DIALOG_WIDTH_SMALL: u16 = 80;
const DIALOG_WIDTH_NORMAL: u16 = 60;

// Animation timing (milliseconds)
const SPINNER_FRAME_DURATION_MS: u128 = 100;
const SPINNER_FRAME_COUNT: u128 = 10;

// Layout percentages
const BUTTON_WIDTH_PERCENT: u16 = 25;
const REVIEW_POPUP_HEIGHT_PERCENT: u16 = 90;
```

**Where to put constants:**
Remember **Code Locality** - constants go in the file that uses them, not in a centralized constants file (unless truly shared across files).

### Code Review Checklist

Before submitting code, verify:

- [ ] No "what" or "how" comments (only "why")
- [ ] No abbreviations in identifiers
- [ ] All functions have clear, descriptive names
- [ ] Complex logic extracted to named functions
- [ ] Magic numbers replaced with named constants
- [ ] Constants live in the file that uses them (code locality)
- [ ] Boolean expressions named for clarity
- [ ] Early returns used, maximum 2 levels of nesting
- [ ] Pure functions separated from side effects
- [ ] Functions under 50 lines
- [ ] Files under 250-300 lines (split by feature if larger)
- [ ] No code repetition
- [ ] No `unsafe` code anywhere