// تکمیل پروفایل: نام، نام خانوادگی و حداقل یک آدرس برای ساخت حساب و خرید الزامی است.
const Address = require("../models/Address");

const hasFullName = (user) => Boolean(String(user?.firstName || "").trim() && String(user?.lastName || "").trim());

async function profileStatus(user) {
  const hasName = hasFullName(user);
  const hasAddress = (await Address.countDocuments({ user: user._id })) > 0;
  return { hasName, hasAddress, profileComplete: hasName && hasAddress };
}

function publicUser(user, status) {
  return {
    id: user._id,
    mobile: user.mobile,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isVerified: user.isVerified,
    role: user.role,
    hasAddress: status.hasAddress,
    profileComplete: status.profileComplete,
  };
}

module.exports = { hasFullName, profileStatus, publicUser };
