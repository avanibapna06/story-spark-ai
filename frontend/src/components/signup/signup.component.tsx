import { useForm, SubmitHandler } from "react-hook-form";
import SSInput from "../ui-component/ss-input/ss-input";
import SSButton from "../ui-component/ss-button/ss-button";
import { useState, useEffect } from "react";
import { storeUserInfo } from "../../services/auth.service";
import toast, { Toaster } from "react-hot-toast";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import logo from "../../assets/logoNew.png";
import { Link } from "react-router-dom";
import { useGoogleLoginMutation } from "../../redux/apis/auth.api";
import {
  useEmailVerifyMutation,
  useVerifyOtpMutation,
} from "../../redux/apis/otp.verify.api";
import { useRegisterUserMutation } from "../../redux/apis/auth.api";
import { useNavigate } from "react-router-dom";
// ✅ FIX: Added missing icon imports that were used but never imported
import { WandSparkles, BookOpen, UsersRound } from "lucide-react";

interface IRegisterInfo {
  name: string;
  email: string;
  password: string;
}

interface Inputs extends IRegisterInfo {
  confirmPassword: string;
  otp: string;
}

const getPasswordError = (password: string) => {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character";
  }
  return "";
};

type StrengthLevel = "weak" | "medium" | "strong";

const PASSWORD_STRENGTH_CONFIG: Record<
  StrengthLevel,
  { label: string; barColor: string; barWidth: string; textColor: string }
> = {
  weak: {
    label: "Weak",
    barColor: "bg-red-500",
    barWidth: "w-1/3",
    textColor: "text-red-400",
  },
  medium: {
    label: "Medium",
    barColor: "bg-yellow-400",
    barWidth: "w-2/3",
    textColor: "text-yellow-300",
  },
  strong: {
    label: "Strong",
    barColor: "bg-green-500",
    barWidth: "w-full",
    textColor: "text-green-400",
  },
};

const getStrengthLevel = (passedChecks: number): StrengthLevel => {
  if (passedChecks <= 2) return "weak";
  if (passedChecks <= 4) return "medium";
  return "strong";
};

const PASSWORD_REQUIREMENTS = [
  { key: "length" as const, label: "Minimum 8 characters" },
  { key: "uppercase" as const, label: "One uppercase letter" },
  { key: "lowercase" as const, label: "One lowercase letter" },
  { key: "number" as const, label: "One number" },
  { key: "special" as const, label: "One special character" },
];

const SignUpComponent = () => {
  const navigate = useNavigate();
  const [emailVerify] = useEmailVerifyMutation();
  const [verifyOtp] = useVerifyOtpMutation();
  const [registerUser] = useRegisterUserMutation();
  const [googleLogin] = useGoogleLoginMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    unregister,
    formState: { errors },
  } = useForm<Inputs>({ mode: "onChange" });

  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [showOtpField, setShowOtpField] = useState<boolean>(false);
  const [registerInfo, setRegisterInfo] = useState<IRegisterInfo>();
  const [expiredAt, setExpiredAt] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const otp = watch("otp");
  const passwordChecks = {
    length: password?.length >= 8,
    uppercase: /[A-Z]/.test(password || ""),
    lowercase: /[a-z]/.test(password || ""),
    number: /[0-9]/.test(password || ""),
    special: /[^A-Za-z0-9]/.test(password || ""),
  };

  const passedChecks = Object.values(passwordChecks).filter(Boolean).length;
  const strengthLevel = getStrengthLevel(passedChecks);
  const { label: strengthLabel, barColor, barWidth, textColor } =
    PASSWORD_STRENGTH_CONFIG[strengthLevel];

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data) {
      const user = {
        name: data.name,
        email: data.email,
        password: data.password,
      };
      const otpPayload = {
        name: data.name,
        email: data.email,
      };
      if (password !== confirmPassword) {
        toast.error("Passwords do not match!");
        return;
      }
      const passwordError = getPasswordError(data.password);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }
      setIsBusy(true);
      try {
        const res = await emailVerify({ ...otpPayload }).unwrap();
        if (res?.data) {
          const { expiresAt } = res.data;
          setExpiredAt(new Date(expiresAt).getTime());
          toast.success("OTP sent to your email");
          setRegisterInfo(user);
          unregister("confirmPassword");
          unregister("password");
          unregister("name");
          unregister("email");
          setShowOtpField(true);
          setCooldown(60);
        }
      } catch (error) {
        const message =
          (error as { data?: Array<{ message?: string }> })?.data?.[0]
            ?.message ||
          "Failed to send OTP. Check backend .env email credentials.";
        toast.error(message);
      } finally {
        setIsBusy(false);
      }
    }
  };

  const handleOtpValidation = async () => {
    const enteredOtp = otp?.trim();
    if (!enteredOtp) {
      toast.error("Please enter OTP");
      return;
    }
    if (!registerInfo) {
      toast.error("Something went wrong. Please restart the process.");
      return;
    }
    if (Date.now() > expiredAt) {
      toast.error("OTP expired. Please request a new one.");
      return;
    }
    setIsBusy(true);
    try {
      const otpResponse = await verifyOtp({
        email: registerInfo.email,
        otp: enteredOtp,
      }).unwrap();

      if (otpResponse?.data?.verificationToken) {
        const res = await registerUser({
          ...registerInfo,
          verificationToken: otpResponse.data.verificationToken,
        }).unwrap();

        if (res.data.accessToken) {
          toast.success("OTP validated successfully!");
          storeUserInfo({ accessToken: res.data.accessToken });
          navigate("/");
        }
      } else {
        throw new Error("No verification token received");
      }
    } catch (err: unknown) {
      const message =
        (err as { data?: Array<{ message?: string }> })?.data?.[0]?.message ||
        "OTP verification failed. Please check the code and try again.";
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isBusy) return;
    if (!registerInfo) {
      toast.error("Something went wrong. Please restart the process.");
      return;
    }
    setIsBusy(true);
    try {
      const otpPayload = {
        name: registerInfo.name,
        email: registerInfo.email,
      };
      const res = await emailVerify({ ...otpPayload }).unwrap();
      if (res?.data) {
        const { expiresAt } = res.data;
        setExpiredAt(new Date(expiresAt).getTime());
        toast.success("OTP resent successfully!");
        setValue("otp", "");
        setCooldown(60);
      }
    } catch (error) {
      const message =
        (error as { data?: Array<{ message?: string }> })?.data?.[0]?.message ||
        "Failed to resend OTP. Please try again.";
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogleLoginSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    setIsBusy(true);
    try {
      const res = await googleLogin({
        token: credentialResponse.credential,
      }).unwrap();

      if (res.data.accessToken) {
        toast.success("User logged in successfully with Google!");
        storeUserInfo({ accessToken: res.data.accessToken });
        navigate("/");
      }
    } catch {
      toast.error("Failed to login with Google. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogleLoginError = () => {
    toast.error("Google login failed. Please try again.");
  };

  return (
    // ✅ FIX: Outer page wrapper — unchanged from original
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 relative overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Ambient blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/*
        ✅ FIX: Removed the rogue unclosed <h3> that appeared right after the
        opening of the card div in the original. That tag was never closed and
        caused every subsequent element to be mis-nested.

        ✅ FIX: Replaced the bare `gap-40` (which caused horizontal overflow on
        small screens) with `gap-8 lg:gap-12` plus `min-w-0` on both columns so
        that flex children can shrink properly.
      */}
      <div className="relative z-10 w-full max-w-6xl py-12 px-4">
        {/* Brand heading */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
          <h2 className="text-center text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 drop-shadow-sm">
            STORY SPARK AI
          </h2>
        </div>

        {/*
          Two-column layout.
          • flex-col on mobile, flex-row on lg+
          • gap-8 keeps columns from touching; no fixed gap that could overflow
          • items-start so the feature list and the card don't stretch oddly
        */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 w-full">

          {/* ── Left column: marketing copy ── */}
          {/*
            ✅ FIX: Added `min-w-0 w-full lg:max-w-sm` so this column shrinks
            on small viewports instead of pushing the card out of bounds.
          */}
          <div className="flex flex-col gap-5 min-w-0 w-full lg:max-w-sm">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-700 bg-clip-text text-transparent">
              Turns Ideas into
              <br />
              unforgettable stories
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              AI powered storytelling that helps you
              <br />
              create, connect, inspire.
            </p>

            {/* Feature tiles */}
            <div className="flex items-center gap-4 border border-gray-300 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800 dark:text-gray-400">
              <WandSparkles className="text-violet-600 shrink-0" />
              <div>
                <h3 className="font-bold">Smart writing</h3>
                <p className="text-sm">AI that understands your ideas</p>
              </div>
            </div>

            <div className="flex items-center gap-4 border border-gray-300 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800 dark:text-gray-400">
              <BookOpen className="text-violet-600 shrink-0" />
              <div>
                <h3 className="font-bold">Endless Creativity</h3>
                <p className="text-sm">Stories that captivate and inspire</p>
              </div>
            </div>

            <div className="flex items-center gap-4 border border-gray-300 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800 dark:text-gray-400">
              <UsersRound className="text-violet-600 shrink-0" />
              <div>
                <h3 className="font-bold">Built for everyone</h3>
                <p className="text-sm">Writers, creators and dreamers</p>
              </div>
            </div>

            <div className="border border-gray-300 p-4 rounded-2xl text-sm bg-slate-50 dark:bg-slate-800 dark:text-gray-400">
              Create, edit, and generate engaging multiple story variations from
              a single prompt. Perfect for writers, creators, and enthusiasts
              exploring the future of fiction.
            </div>
          </div>

          {/* ── Right column: auth card ── */}
          {/*
            ✅ FIX: Added `min-w-0` so the card can shrink below its content
            width on narrow viewports — this is the primary overflow fix.
            `w-full max-w-md` ensures it never grows wider than 448 px but
            fills the available space on mobile.
          */}
          <div className="w-full max-w-md min-w-0 rounded-3xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {showOtpField ? "Verify Your Email" : "Create Account"}
            </h3>

            {!showOtpField && (
              <p className="mt-2 mb-5 text-center text-sm text-slate-400">
                Join StorySparkAI and begin your creative journey.
              </p>
            )}

            {!showOtpField && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-semibold">
                    SIGN UP WITH EMAIL
                  </span>
                </div>
              </div>
            )}

            {!showOtpField ? (
              /* ── Registration form ── */
              /*
                ✅ FIX: Added `overflow-hidden` on the form so any internal
                element that momentarily overflows is clipped rather than
                expanding the card width.
              */
              <form
                className="space-y-5 w-full min-w-0 overflow-hidden"
                onSubmit={handleSubmit(onSubmit)}
              >
                <SSInput
                  label="Name"
                  name="name"
                  placeholder="Enter your name"
                  required={true}
                  icon="fi fi-rr-user"
                  register={register}
                  autoComplete="name"
                  validation={{
                    required: "Name is required",
                    minLength: {
                      value: 2,
                      message: "Name must be at least 2 characters",
                    },
                    pattern: {
                      value: /^[A-Za-z0-9\s._]+$/,
                      message:
                        "Only letters, numbers, spaces, underscores, and dots are allowed",
                    },
                  }}
                  error={errors.name}
                />

                <SSInput
                  label="Email address"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required={true}
                  icon="fi fi-rr-envelope"
                  register={register}
                  autoComplete="email"
                  error={errors.email}
                />

                <SSInput
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required={true}
                  icon="fi fi-rr-lock"
                  register={register}
                  autoComplete="new-password"
                  error={errors.password}
                />

                {password?.length > 0 && (
                  <div className="space-y-3 -mt-2 min-w-0 overflow-hidden">
                    <div
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden select-none"
                      role="progressbar"
                      aria-valuenow={passedChecks}
                      aria-valuemin={0}
                      aria-valuemax={PASSWORD_REQUIREMENTS.length}
                      aria-label="Password strength"
                    >
                      <div
                        className={`h-full transition-all duration-300 ${barColor} ${barWidth}`}
                      />
                    </div>

                    <p
                      className={`text-xs font-bold uppercase tracking-wider select-none ${textColor}`}
                      aria-live="polite"
                    >
                      {strengthLabel} Password
                    </p>

                    <ul className="space-y-1.5 list-none p-0 m-0 w-full box-border text-[11px] font-medium">
                      {PASSWORD_REQUIREMENTS.map(({ key, label }) => {
                        const met = passwordChecks[key];
                        return (
                          <li
                            key={key}
                            className={`flex items-center gap-2 ${
                              met
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-400 dark:text-slate-600"
                            }`}
                            aria-label={`${label}: ${met ? "met" : "not met"}`}
                          >
                            <i
                              className={`fa-solid ${
                                met ? "fa-circle-check" : "fa-circle-xmark"
                              } text-xs shrink-0`}
                              aria-hidden="true"
                            />
                            <span>{label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <SSInput
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  required={!showOtpField}
                  icon="fi fi-rr-eye"
                  register={register}
                  autoComplete="new-password"
                  validation={{
                    validate: (value) => {
                      if (showOtpField) return true;
                      if (!value) return "Confirm password is required";
                      if (value !== password) return "Passwords do not match!";
                      return true;
                    },
                  }}
                  error={errors.confirmPassword}
                />

                <div className="pt-2">
                  <SSButton text="Sign Up" type="submit" isLoading={isBusy} />
                </div>
              </form>
            ) : (
              /* ── OTP verification ── */
              <div className="grid grid-cols-1 gap-4 w-full box-border">
                <SSInput
                  label="OTP"
                  name="otp"
                  placeholder="Enter your OTP"
                  required={true}
                  icon="fi fi-rr-key"
                  register={register}
                  validation={{
                    required: "Please enter OTP",
                    minLength: {
                      value: 6,
                      message: "OTP must be 6 digits",
                    },
                    maxLength: {
                      value: 6,
                      message: "OTP must be 6 digits",
                    },
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: "OTP must contain only numbers",
                    },
                  }}
                  error={errors.otp}
                />

                <SSButton
                  text="Verify OTP"
                  type="button"
                  onClick={handleOtpValidation}
                  isLoading={isBusy}
                />

                <div className="text-center pt-2 select-none">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || isBusy}
                    className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 disabled:text-slate-400 dark:disabled:text-slate-600 transition-colors duration-150 focus:outline-none disabled:cursor-not-allowed cursor-pointer"
                  >
                    {cooldown > 0 ? `Resend OTP (${cooldown}s)` : "Resend OTP"}
                  </button>
                </div>
              </div>
            )}

            {!showOtpField && (
              <>
                <div className="relative my-8 w-full box-border">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-4 text-slate-400 dark:text-slate-500 font-medium">
                      Or
                    </span>
                  </div>
                </div>

                <div className="flex justify-center w-full box-border">
                  <GoogleLogin
                    onSuccess={handleGoogleLoginSuccess}
                    onError={handleGoogleLoginError}
                  />
                </div>

                <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Sign In
                  </Link>
                </p>
              </>
            )}
          </div>
          {/* ── end auth card ── */}
        </div>
        {/* ── end two-column layout ── */}
      </div>

      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
};

export default SignUpComponent;
