-- Support Messages Database Schema
-- This creates tables for customer support conversations and messages

-- Support conversations table
CREATE TABLE IF NOT EXISTS support_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    subject VARCHAR(255),
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assigned_to INT NULL, -- admin user ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES admin_users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_last_message_at (last_message_at)
);

-- Support messages table
CREATE TABLE IF NOT EXISTS support_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_type ENUM('customer', 'admin', 'system') NOT NULL,
    sender_id INT NULL, -- user_id for customer, admin_user_id for admin
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    message_content TEXT NOT NULL,
    message_type ENUM('text', 'order_inquiry', 'system_notification') DEFAULT 'text',
    order_id VARCHAR(100) NULL, -- reference to order if message is about specific order
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES support_conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_type (sender_type),
    INDEX idx_created_at (created_at),
    INDEX idx_is_read (is_read)
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_user_status ON support_conversations(user_id, status);
CREATE INDEX idx_messages_conversation_read ON support_messages(conversation_id, is_read);

-- Insert sample data for testing
INSERT INTO support_conversations (user_email, user_name, subject, status) VALUES
('john@example.com', 'John Doe', 'Question about order #12345', 'open'),
('sarah@example.com', 'Sarah Wilson', 'Return request', 'resolved');

INSERT INTO support_messages (conversation_id, sender_type, sender_name, sender_email, message_content, message_type) VALUES
(1, 'customer', 'John Doe', 'john@example.com', 'Hi, I have a question about my order #12345', 'order_inquiry'),
(1, 'customer', 'John Doe', 'john@example.com', 'When will it be shipped?', 'text'),
(2, 'customer', 'Sarah Wilson', 'sarah@example.com', 'I need help with returns', 'text'),
(2, 'admin', 'Admin', 'admin@gkicks.com', 'You can return items within 30 days. Please visit our returns page.', 'text'),
(2, 'customer', 'Sarah Wilson', 'sarah@example.com', 'Thank you for the quick response!', 'text');

SELECT 'Support messages schema created successfully!' as message;