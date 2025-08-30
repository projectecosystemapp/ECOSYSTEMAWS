import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export async function getAuthenticatedUser() {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    
    return {
      userId: user.userId,
      username: user.username,
      signInDetails: user.signInDetails,
      // Get the email from signInDetails or username
      email: user.signInDetails?.loginId || user.username || '',
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

export async function getUserGroups() {
  try {
    const session = await fetchAuthSession();
    const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] || [];
    return groups;
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

export async function isAdmin() {
  const groups = await getUserGroups();
  return groups.includes('Admins');
}

export async function isProvider() {
  const groups = await getUserGroups();
  return groups.includes('Providers');
}

export async function isCustomer() {
  const groups = await getUserGroups();
  return groups.includes('Customers');
}