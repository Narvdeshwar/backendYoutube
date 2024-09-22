import mongoose, { Schema } from "mongoose";

const subscriptionSchema =
  ({
    subscriber: {
      typeof: Schema.Types.ObjectId, // one who is subscribing
      ref: User,
    },
    channel: {
      typeof: Schema.Types.ObjectId, // one to whom 'subscriber' is subscriber
      ref: User,
    },
  },
  { timestamps: true });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
