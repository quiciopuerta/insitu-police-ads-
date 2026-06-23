# Skill: AI API Control & Status Monitoring

## Description
Advanced methodology for monitoring and managing multiple AI API keys (Gemini, etc.) to ensure high availability and performance of the application's core AI features.

## Capabilities
- **Status Semaphore**: Visualize the health of API keys in real-time (Online, Degraded, Offline).
- **Latency Tracking**: Measure response times to identify slow providers.
- **Failover Management**: Enable/Disable keys manually based on performance or quota limits.
- **Automatic Key Rotation**: (Internal) Service-level rotation prioritizing healthy keys.

## Admin Procedures
1.  **Auditing Health**: In the Admin Dashboard -> Configuración -> APIs REST, click the **"Probar"** button next to any key.
2.  **Interpreting Semaphore**:
    - 🟢 **Green**: API is fully operational (< 2s latency).
    - 🟡 **Yellow**: API is responding but slow (> 2s latency) or occasionally erroring.
    - 🔴 **Red**: API is unreachable or key is invalid.
3.  **Corrective Action**: If a key turns Red, deactivate it to prevent it from being part of the internal rotation, then check the provider's billing or quota.

## Maintenance
Keys should be rotate or updated when they reach their quota limits or show consistent "Degraded" status.
