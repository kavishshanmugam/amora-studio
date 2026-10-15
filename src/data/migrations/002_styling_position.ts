export default {
  name: "002_styling_position",
  statements: [
    `ALTER TABLE styling_items ADD COLUMN position INTEGER NOT NULL DEFAULT 0`,
  ],
};
