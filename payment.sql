CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  txnid VARCHAR(50) NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  customer_id INT(10) NOT NULL,
  firstname VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  status VARCHAR(20),
  request TEXT,
  response TEXT,
  error_msg TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



