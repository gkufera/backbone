-- CreateIndex
CREATE INDEX "elements_script_id_deleted_at_idx" ON "elements"("script_id", "deleted_at");

-- CreateIndex
CREATE INDEX "options_element_id_idx" ON "options"("element_id");

-- CreateIndex
CREATE INDEX "production_members_production_id_deleted_at_idx" ON "production_members"("production_id", "deleted_at");

-- CreateIndex
CREATE INDEX "scripts_production_id_status_idx" ON "scripts"("production_id", "status");

-- CreateIndex
CREATE INDEX "departments_production_id_deleted_at_idx" ON "departments"("production_id", "deleted_at");

-- CreateIndex
CREATE INDEX "notes_option_id_idx" ON "notes"("option_id");
