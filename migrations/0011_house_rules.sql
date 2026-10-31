-- Add the newly published pet and visitor policies to the active contract.
UPDATE contracts
SET content = content || '\n\n• No pets are allowed.\n• Visitors staying at Casa Vicenta are subject to additional charges.'
WHERE active = 1
  AND content NOT LIKE '%No pets are allowed%';
