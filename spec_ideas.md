## Data Models

Core models (defined in `prisma/schema.prisma`):

```
User          {id, name, email, role, department_id}
Department    {id, name, production_id}
Production    {id, title, created_by}
Script        {id, production_id, version, pdf_url, uploaded_at}
Element       {id, script_id, label, page, category, status}
Option        {id, element_id, media_type, url, description, status, uploaded_by, ready_for_review}
Approval      {id, option_id, user_id, decision, note, timestamp}
Comment       {id, user_id, element_id, option_id, text, timestamp}
Notification  {id, user_id, type, message, read, timestamp}
```

### Roles

- **Director/Producer**: Can approve/reject/maybe options. Sees the news feed.
- **Department Head**: Can upload options, mark them ready for review, manage department members.
- **Contributor**: Can upload options within their department.
- **Assistant**: Can triage elements, add comments, manage workflow.

### Element Status Flow

```
Pending → Outstanding → Approved
                ↑            ↓
                └── Rejected (dept can re-upload, element returns to Outstanding)
```

- **Pending**: Element detected but no options uploaded yet
- **Outstanding**: Has options but none approved
- **Approved**: Director approved one option — element is resolved

### Approval Workflow

```
Department uploads options for an element
    → Department marks "Ready for Review"
    → Option appears in Director's news feed
    → Director decides: Approve (green) / Reject (red) / Maybe (yellow)
    → Departments notified of decisions
    → If approved: element resolved, locked
    → If rejected: department can upload new options, re-review cycle
    → Element stays "outstanding" until one option is Approved
```

## Script Processing

### PDF Upload Flow

1. User uploads PDF script file
2. Backend stores PDF in S3, records Script in database
3. Text extraction runs (pdf-parse or similar library)
4. ALL-CAPS words are identified as potential elements (props, locations, characters)
5. Elements are created with page numbers and labels
6. User can manually add/remove/edit elements

### Script Revision Flow

1. User uploads new PDF draft
2. System extracts elements from new draft
3. Text-matching compares new elements to existing ones
4. Unchanged elements keep their options and approval status
5. Mismatched elements prompt a reconciliation UI (map or drop)
6. New elements are created as Pending
