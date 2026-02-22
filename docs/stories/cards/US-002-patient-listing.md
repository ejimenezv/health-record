# User Story US-002: Patient Listing and Search

## Story Card

**As a** doctor
**I want to** view and search through my list of patients
**So that** I can quickly find a specific patient to view their profile or start an appointment

---

## Description

The doctor needs an efficient way to browse and search through registered patients. The patient list should show key information at a glance and support searching by name or phone number. Results should update in real-time as the doctor types, providing instant feedback.

This is the main navigation hub for accessing patient records and is used frequently throughout the application workflow.

---

## Acceptance Criteria

- [ ] Given I am on the patient list page, when the page loads, then I see a list of all patients sorted alphabetically by last name
- [ ] Given there are patients in the system, when I view the list, then I see each patient's name, date of birth, phone, and calculated age
- [ ] Given I type in the search field, when I enter a partial name, then the list filters to show matching patients in real-time
- [ ] Given I search for "Joh", when results display, then I see patients named "John", "Johnson", "Johann", etc. (partial match)
- [ ] Given I search for a phone number, when results display, then I see patients with matching phone numbers
- [ ] Given my search matches no patients, when results display, then I see a "No patients found" message
- [ ] Given I clear the search field, when the field is empty, then I see all patients again
- [ ] Given I click on a patient in the list, when I click, then I navigate to that patient's profile page
- [ ] Given the search is case-insensitive, when I search "john" or "JOHN", then I find "John"

---

## Priority

**Must-Have (P0)**

---

## Story Points

**3 points**

Rationale: Standard list/search functionality with real-time filtering.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Patient Registration | Required | US-001 |
| Data Persistence | Required | US-011 |

---

## Technical Notes

### Search Implementation

```typescript
interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
  age: number;  // Calculated
}

interface SearchParams {
  query: string;
  sortBy: 'lastName' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}
```

### Implementation Considerations

- Implement debounced search (300ms delay) to avoid excessive queries
- Search should query: first_name, last_name, phone, email (case-insensitive)
- Use database ILIKE for PostgreSQL partial matching
- Consider pagination for large patient lists (>100)
- Index database fields used for search: (last_name, first_name), phone

### API Endpoints

```
GET /api/patients                  - List all patients
GET /api/patients?search=query     - Search patients
GET /api/patients?page=1&limit=20  - Paginated list
```

### Query Example

```sql
SELECT * FROM patients
WHERE
  LOWER(first_name) LIKE LOWER('%query%') OR
  LOWER(last_name) LIKE LOWER('%query%') OR
  phone LIKE '%query%'
ORDER BY last_name ASC
LIMIT 20 OFFSET 0;
```

---

## UI/UX Notes

### List Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         PATIENTS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [🔍 Search patients by name or phone...        ]  [+ New Patient]
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  👤 Martinez, Ana                          Age: 45      │   │
│  │     DOB: 1981-03-15    Phone: (555) 123-4567            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  👤 Rodriguez, Carlos                      Age: 32      │   │
│  │     DOB: 1994-07-22    Phone: (555) 234-5678            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  👤 Smith, John                            Age: 58      │   │
│  │     DOB: 1968-01-10    Phone: (555) 345-6789            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Showing 3 of 3 patients                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Empty States

**No Patients:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    👥 No patients yet                           │
│                                                                  │
│          Register your first patient to get started             │
│                                                                  │
│                    [+ Add First Patient]                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**No Search Results:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│               🔍 No patients match "xyz"                        │
│                                                                  │
│           Try a different search term or                        │
│           [+ Register New Patient]                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Guidelines

- Search bar should be prominent at top of page
- Patient cards should be scannable at a glance
- Clicking anywhere on card navigates to profile
- Hover state on patient cards
- "New Patient" quick action button always visible
- Loading skeleton while fetching patients
- Real-time search with no submit button needed

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Load page | - | All patients displayed alphabetically |
| Search by first name | "Ana" | Show patients with first name containing "Ana" |
| Search by last name | "Smith" | Show patients with last name containing "Smith" |
| Search by phone | "555" | Show patients with phone containing "555" |
| Case insensitive | "JOHN" | Find "John", "john", "Johnson" |
| No results | "xyz123" | Show "No patients found" message |
| Clear search | Clear input | Show all patients again |
| Click patient | Click card | Navigate to patient profile |
| Empty state | No patients exist | Show empty state with CTA |

---

## Definition of Done

- [ ] Patient list loads on page access
- [ ] Search filters results in real-time
- [ ] Search is case-insensitive
- [ ] Partial matches work correctly
- [ ] Empty states display properly
- [ ] Patient cards are clickable
- [ ] Navigation to patient profile works
- [ ] Loading state shows during fetch
- [ ] Unit tests pass
- [ ] Manual QA verified
