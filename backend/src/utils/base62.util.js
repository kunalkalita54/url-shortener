export function toBase62(num) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  
  while(num>0) {
    const remainder=num%62;
    const letter=chars.charAt(remainder);
    num=Math.floor(num/62);
    result=letter+result;
  }
  
  return result;
}

