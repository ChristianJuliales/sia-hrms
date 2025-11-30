// ===================================================
// SUPABASE CONFIGURATION
// ===================================================

const SUPABASE_URL = 'https://pheupnmnisguenfqaphs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZXVwbm1uaXNndWVuZnFhcGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzY2ODcsImV4cCI6MjA3OTgxMjY4N30.CYN8o3ilyeRY1aYLy7Vut47pLskF6gIcBv4zE3kOUqM';

// Initialize Supabase client
// The Supabase CDN exposes the global 'supabase' object with createClient method
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================================================
// HELPER FUNCTIONS
// ===================================================

// Handle Supabase errors
function handleSupabaseError(error, context) {
  console.error(`Supabase Error (${context}):`, error);
  return null;
}

// Show loading state
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<tr><td colspan="10" class="empty">Loading...</td></tr>';
  }
}

// Export for use in other files
window.supabaseClient = supabaseClient;
window.handleSupabaseError = handleSupabaseError;
window.showLoading = showLoading;





// --- Supabase Interaction: Fetching Leave Data ---
async function fetchLeaves() {
    try {
        // Fetch leave requests and join with employee data to get names and IDs
        const { data, error } = await supabase
            .from('leave_requests')
            .select(`
                id,
                employee_id,
                leave_type,
                start_date,
                end_date,
                number_of_days,
                status,
                comments, // Use 'comments' for the reason
                created_at,
                employees(
                    employee_id,
                    first_name,
                    last_name
                )
            `)
            .order('created_at', { ascending: true }); // Show oldest first for approval

        if (error) throw error;

        // Map the joined data into a flatter, easier-to-use structure
        return data.map(l => ({
            id: l.id,
            employeeId: l.employees ? l.employees.employee_id : 'N/A', // Readable ID
            employeeName: l.employees ? `${l.employees.first_name} ${l.employees.last_name}` : 'Unknown Employee',
            leaveType: l.leave_type,
            startDate: l.start_date,
            endDate: l.end_date,
            numberOfDays: l.number_of_days,
            status: l.status,
            reason: l.comments || 'No reason provided', // Use 'comments' as the reason
            createdAt: l.created_at
        }));

    } catch (error) {
        console.error('Error fetching leaves for approval:', error);
        return [];
    }
}

// --- Rendering: Displays the list of pending requests ---
async function renderApprovalQueue() {
    const approvalList = document.getElementById('approvalList'); // Assuming you have a container with this ID
    if (!approvalList) return;

    const allLeaves = await fetchLeaves();
    
    // Filter to show ONLY pending requests for the approval queue
    const pendingQueue = allLeaves.filter(l => l.status === 'Pending'); 

    if (!pendingQueue.length) {
        approvalList.innerHTML = '<p class="no-requests-found">No pending requests require approval.</p>';
        return;
    }

    // Render the cards with Approve/Reject buttons
    approvalList.innerHTML = pendingQueue.map(l => `
        <div class="approval-card pending" data-id="${l.id}">
            <div class="card-header">
                <h4>${l.employeeName} <span class="status ${l.status}">${l.status}</span></h4>
                <p>ID: ${l.employeeId}</p>
            </div>
            <div class="card-body">
                <p><strong>Leave Type:</strong> ${l.leaveType}</p>
                <p><strong>Dates:</strong> ${l.startDate} → ${l.endDate} (${l.numberOfDays} days)</p>
                <p><strong>Reason:</strong> ${l.reason}</p>
            </div>
            <div class="card-actions">
                <button class="btn-approve" onclick="updateLeaveStatus('${l.id}', 'Approved')">Approve</button>
                <button class="btn-reject" onclick="updateLeaveStatus('${l.id}', 'Rejected')">Reject</button>
            </div>
        </div>
    `).join('');
}

// --- Action: Update Leave Status (Approve/Reject) ---
async function updateLeaveStatus(requestId, newStatus) {
    const loggedInUserString = localStorage.getItem('loggedInUser');
    if (!loggedInUserString) {
        alert('Authentication error. Please log in again.');
        return;
    }
    const loggedInUser = JSON.parse(loggedInUserString);
    const approverId = loggedInUser.user_id; // Assuming user_id holds the UUID of the approver

    try {
        const { error } = await supabase
            .from('leave_requests')
            .update({
                status: newStatus,
                approved_by: approverId, // UUID of the HR/Manager
                approved_date: new Date().toISOString() // Use 'approved_date'
            })
            .eq('id', requestId);

        if (error) throw error;

        alert(`Leave request ${requestId} has been ${newStatus.toLowerCase()}.`);
        
        // Refresh the list after successful update
        renderApprovalQueue(); 

    } catch (error) {
        console.error(`Error updating leave to ${newStatus}:`, error);
        alert(`Failed to update leave request. Check console for details.`);
    }
}


// --- Initialization ---
document.addEventListener("DOMContentLoaded", renderApprovalQueue);